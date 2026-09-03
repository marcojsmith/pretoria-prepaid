import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { calculateTierBreakdown, selectActiveRates } from "./electricity_logic";
import { DATE_MONTH_LENGTH } from "./constants";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";
import { resolveEffectiveUserId } from "./lib/household";
import { resolveMeter } from "./lib/meters";
import type { Doc, Id } from "./_generated/dataModel";

const ERR_NOT_AUTHENTICATED = "Not authenticated";

async function repriceSorted(options: {
  ctx: MutationCtx;
  monthPurchases: Doc<"purchases">[];
  rates: Doc<"electricity_rates">[];
}) {
  const { ctx, monthPurchases, rates } = options;
  // Sort by date (ascending) to maintain correct tier sequence.
  // Use _creationTime as secondary sort for stable order if dates are identical.
  const sortedPurchases = monthPurchases.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a._creationTime - b._creationTime;
  });

  let unitsAlreadyBought = 0;

  for (const purchase of sortedPurchases) {
    const { breakdown, total } = calculateTierBreakdown({
      units: purchase.units,
      unitsAlreadyBought,
      rates: selectActiveRates(rates, purchase.date),
    });

    await ctx.db.patch(purchase._id, {
      tierBreakdown: breakdown,
      cost: total, // Theoretical cost based on tiers
    });

    unitsAlreadyBought += purchase.units;
  }
}

async function recalculateByUserId(options: {
  ctx: MutationCtx;
  userId: string;
  monthKey: string;
}) {
  const { ctx, userId, monthKey } = options;
  const rates = await ctx.db.query("electricity_rates").collect();
  if (rates.length === 0) return;

  const monthPurchases = await ctx.db
    .query("purchases")
    .withIndex("by_userId_date", (q) =>
      q.eq("userId", userId).gte("date", monthKey).lt("date", `${monthKey}-￿`)
    )
    .collect();

  await repriceSorted({ ctx, monthPurchases, rates });
}

async function recalculateByMeterId(options: {
  ctx: MutationCtx;
  meterId: Id<"meters">;
  monthKey: string;
}) {
  const { ctx, meterId, monthKey } = options;
  const rates = await ctx.db.query("electricity_rates").collect();
  if (rates.length === 0) return;

  const monthPurchases = await ctx.db
    .query("purchases")
    .withIndex("by_meterId_date", (q) =>
      q.eq("meterId", meterId).gte("date", monthKey).lt("date", `${monthKey}-￿`)
    )
    .collect();

  await repriceSorted({ ctx, monthPurchases, rates });
}

/**
 * Recalculates all purchases for a specific user (or meter, when provided)
 * and month. This ensures that tier breakdowns are correct even if purchases
 * are added or deleted out of order.
 */
export const recalculateMonthlyPurchases = internalMutation({
  args: {
    userId: v.string(),
    monthKey: v.string(), // YYYY-MM
    meterId: v.optional(v.id("meters")),
  },
  handler: async (ctx, args) => {
    if (args.meterId) {
      await recalculateByMeterId({ ctx, meterId: args.meterId, monthKey: args.monthKey });
      return;
    }
    await recalculateByUserId({ ctx, userId: args.userId, monthKey: args.monthKey });
  },
});

export const getPurchases = query({
  args: { meterId: v.optional(v.id("meters")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);
    if (meter) {
      return await ctx.db
        .query("purchases")
        .withIndex("by_meterId_date", (q) => q.eq("meterId", meter._id))
        .order("desc")
        .collect();
    }

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
    return await ctx.db
      .query("purchases")
      .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .collect();
  },
});

function computeBreakdown(options: {
  rates: Doc<"electricity_rates">[];
  priorPurchases: Doc<"purchases">[];
  units: number;
  date: string;
}) {
  const { rates, priorPurchases, units, date } = options;
  const unitsBefore = priorPurchases.reduce((sum, p) => sum + p.units, 0);
  return calculateTierBreakdown({
    units,
    unitsAlreadyBought: unitsBefore,
    rates: selectActiveRates(rates, date),
  });
}

interface AddPurchaseArgs {
  date: string;
  units: number;
  amountPaid: number;
  meterReading: number;
}

async function addPurchaseOnMeter(options: {
  ctx: MutationCtx;
  meter: Doc<"meters">;
  effectiveUserId: string;
  args: AddPurchaseArgs;
}) {
  const { ctx, meter, effectiveUserId, args } = options;
  const monthKey = args.date.substring(0, DATE_MONTH_LENGTH);
  const rates = await ctx.db.query("electricity_rates").collect();

  const monthPurchases = await ctx.db
    .query("purchases")
    .withIndex("by_meterId_date", (q) =>
      q.eq("meterId", meter._id).gte("date", monthKey).lte("date", args.date)
    )
    .collect();

  const { breakdown, total } = computeBreakdown({
    rates,
    priorPurchases: monthPurchases,
    units: args.units,
    date: args.date,
  });

  const purchaseId = await ctx.db.insert("purchases", {
    userId: effectiveUserId,
    meterId: meter._id,
    date: args.date,
    units: args.units,
    cost: total,
    amountPaid: args.amountPaid,
    tierBreakdown: breakdown,
  });

  await ctx.db.insert("meter_readings", {
    userId: effectiveUserId,
    meterId: meter._id,
    date: args.date,
    readingPre: args.meterReading,
    readingPost: args.meterReading + args.units,
    source: "purchase",
  });

  await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
    userId: effectiveUserId,
    monthKey,
    meterId: meter._id,
  });

  return purchaseId;
}

async function addPurchaseLegacy(options: {
  ctx: MutationCtx;
  effectiveUserId: string;
  args: AddPurchaseArgs;
}) {
  const { ctx, effectiveUserId, args } = options;
  const monthKey = args.date.substring(0, DATE_MONTH_LENGTH);
  const rates = await ctx.db.query("electricity_rates").collect();

  const monthPurchases = await ctx.db
    .query("purchases")
    .withIndex("by_userId_date", (q) =>
      q.eq("userId", effectiveUserId).gte("date", monthKey).lte("date", args.date)
    )
    .collect();

  const { breakdown, total } = computeBreakdown({
    rates,
    priorPurchases: monthPurchases,
    units: args.units,
    date: args.date,
  });

  const purchaseId = await ctx.db.insert("purchases", {
    userId: effectiveUserId,
    date: args.date,
    units: args.units,
    cost: total,
    amountPaid: args.amountPaid,
    tierBreakdown: breakdown,
  });

  await ctx.db.insert("meter_readings", {
    userId: effectiveUserId,
    date: args.date,
    readingPre: args.meterReading,
    readingPost: args.meterReading + args.units,
    source: "purchase",
  });

  await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
    userId: effectiveUserId,
    monthKey,
  });

  return purchaseId;
}

export const addPurchase = mutation({
  args: {
    date: v.string(),
    units: v.number(),
    cost: v.number(),
    amountPaid: v.number(),
    meterReading: v.number(), // Current reading before purchase (now required)
    meterId: v.optional(v.id("meters")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(ERR_NOT_AUTHENTICATED);
    }

    await checkRateLimit({
      ctx,
      userId: identity.tokenIdentifier,
      action: "addPurchase",
      limit: RATE_LIMITS.addPurchase.limit,
      windowMs: RATE_LIMITS.addPurchase.windowMs,
    });

    if (args.units < 0 || args.cost < 0 || args.amountPaid < 0) {
      throw new Error("Values cannot be negative");
    }

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);

    if (meter) {
      return await addPurchaseOnMeter({ ctx, meter, effectiveUserId, args });
    }
    return await addPurchaseLegacy({ ctx, effectiveUserId, args });
  },
});

async function deletePurchaseOnMeter(options: {
  ctx: MutationCtx;
  meter: Doc<"meters">;
  purchase: Doc<"purchases">;
}) {
  const { ctx, meter, purchase } = options;
  if (purchase.meterId !== meter._id) {
    throw new Error("Unauthorized");
  }

  const monthKey = purchase.date.substring(0, DATE_MONTH_LENGTH);
  await ctx.db.delete(purchase._id);

  const readings = await ctx.db
    .query("meter_readings")
    .withIndex("by_meterId_date", (q) => q.eq("meterId", meter._id).eq("date", purchase.date))
    .filter((q) => q.eq(q.field("source"), "purchase"))
    .take(1);

  const firstReading = readings[0];
  if (firstReading) {
    await ctx.db.delete(firstReading._id);
  }

  await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
    userId: purchase.userId,
    monthKey,
    meterId: meter._id,
  });
}

async function deletePurchaseLegacy(options: {
  ctx: MutationCtx;
  effectiveUserId: string;
  purchase: Doc<"purchases">;
}) {
  const { ctx, effectiveUserId, purchase } = options;
  if (purchase.userId !== effectiveUserId) {
    throw new Error("Unauthorized");
  }

  const monthKey = purchase.date.substring(0, DATE_MONTH_LENGTH);
  await ctx.db.delete(purchase._id);

  const reading = await ctx.db
    .query("meter_readings")
    .withIndex("by_userId_date", (q) => q.eq("userId", purchase.userId).eq("date", purchase.date))
    .filter((q) => q.eq(q.field("source"), "purchase"))
    .take(1);

  const firstReading = reading[0];
  if (firstReading) {
    await ctx.db.delete(firstReading._id);
  }

  await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
    userId: effectiveUserId,
    monthKey,
  });
}

export const deletePurchase = mutation({
  args: { id: v.id("purchases"), meterId: v.optional(v.id("meters")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTHENTICATED);

    await checkRateLimit({
      ctx,
      userId: identity.tokenIdentifier,
      action: "deletePurchase",
      limit: RATE_LIMITS.deletePurchase.limit,
      windowMs: RATE_LIMITS.deletePurchase.windowMs,
    });

    const purchase = await ctx.db.get(args.id);
    if (!purchase) return;

    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);
    if (meter) {
      await deletePurchaseOnMeter({ ctx, meter, purchase });
      return;
    }

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
    await deletePurchaseLegacy({ ctx, effectiveUserId, purchase });
  },
});
