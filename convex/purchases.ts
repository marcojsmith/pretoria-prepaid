import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { calculateTierBreakdown } from "./electricity_logic";
import { DATE_MONTH_LENGTH } from "./constants";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";
import { resolveEffectiveUserId } from "./lib/household";

/**
 * Recalculates all purchases for a specific user and month.
 * This ensures that tier breakdowns are correct even if purchases
 * are added or deleted out of order.
 */
export const recalculateMonthlyPurchases = internalMutation({
  args: {
    userId: v.string(),
    monthKey: v.string(), // YYYY-MM
  },
  handler: async (ctx, args) => {
    // 1. Fetch all rates
    const rates = await ctx.db.query("electricity_rates").collect();
    if (rates.length === 0) return;

    // 2. Fetch all purchases for this user for the specific month using composite index
    const monthPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId_date", (q) =>
        q
          .eq("userId", args.userId)
          .gte("date", args.monthKey)
          .lt("date", args.monthKey + "-\uffff")
      )
      .collect();

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
        rates,
      });

      await ctx.db.patch(purchase._id, {
        tierBreakdown: breakdown,
        cost: total, // Theoretical cost based on tiers
      });

      unitsAlreadyBought += purchase.units;
    }
  },
});

export const getPurchases = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

    return await ctx.db
      .query("purchases")
      .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .collect();
  },
});

export const addPurchase = mutation({
  args: {
    date: v.string(),
    units: v.number(),
    cost: v.number(),
    amountPaid: v.number(),
    meterReading: v.number(), // Current reading before purchase (now required)
  },
  // eslint-disable-next-line llm-core/max-function-length
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await checkRateLimit({
      ctx,
      userId: identity.tokenIdentifier,
      action: "addPurchase",
      limit: RATE_LIMITS.addPurchase.limit,
      windowMs: RATE_LIMITS.addPurchase.windowMs,
    });

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

    if (args.units < 0 || args.cost < 0 || args.amountPaid < 0) {
      throw new Error("Values cannot be negative");
    }

    // Server-side calculation of initial breakdown
    const monthKey = args.date.substring(0, DATE_MONTH_LENGTH);
    const rates = await ctx.db.query("electricity_rates").collect();

    // Get units already bought this month before this point using composite index.
    // We include same-day purchases to handle multiple entries on the same day.
    const monthPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", effectiveUserId).gte("date", monthKey).lte("date", args.date)
      )
      .collect();

    // Since this is a new purchase, we don't have its _creationTime yet.
    // However, all existing records in 'monthPurchases' were created BEFORE this one.
    const unitsBefore = monthPurchases.reduce((sum, p) => sum + p.units, 0);
    const { breakdown, total } = calculateTierBreakdown({
      units: args.units,
      unitsAlreadyBought: unitsBefore,
      rates,
    });

    const purchaseId = await ctx.db.insert("purchases", {
      userId: effectiveUserId,
      date: args.date,
      units: args.units,
      cost: total, // Use calculated theoretical cost
      amountPaid: args.amountPaid, // Store what they actually paid
      tierBreakdown: breakdown,
    });

    // Create ONE reading per purchase with pre/post values
    await ctx.db.insert("meter_readings", {
      userId: effectiveUserId,
      date: args.date,
      readingPre: args.meterReading,
      readingPost: args.meterReading + args.units,
      source: "purchase",
    });

    // Trigger sequential recalculation for the entire month to be safe
    await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
      userId: effectiveUserId,
      monthKey,
    });

    return purchaseId;
  },
});

export const deletePurchase = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await checkRateLimit({
      ctx,
      userId: identity.tokenIdentifier,
      action: "deletePurchase",
      limit: RATE_LIMITS.deletePurchase.limit,
      windowMs: RATE_LIMITS.deletePurchase.windowMs,
    });

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

    const purchase = await ctx.db.get(args.id);
    if (!purchase) return;
    if (purchase.userId !== effectiveUserId) {
      throw new Error("Unauthorized");
    }

    const monthKey = purchase.date.substring(0, DATE_MONTH_LENGTH);
    await ctx.db.delete(args.id);

    // Also delete the associated meter reading
    const reading = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", purchase.userId).eq("date", purchase.date))
      .filter((q) => q.eq(q.field("source"), "purchase"))
      .take(1);

    const firstReading = reading[0];
    if (firstReading) {
      await ctx.db.delete(firstReading._id);
    }

    // Trigger recalculation for the month
    await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
      userId: effectiveUserId,
      monthKey,
    });
  },
});
