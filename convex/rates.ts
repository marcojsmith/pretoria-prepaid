import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { selectActiveRates } from "./electricity_logic";
import { todaySast } from "./lib/date";
import {
  DATE_MONTH_LENGTH,
  TIER_1_MIN,
  TIER_1_MAX,
  TIER_1_RATE,
  TIER_2_MIN,
  TIER_2_MAX,
  TIER_2_RATE,
  TIER_3_MIN,
  TIER_3_MAX,
  TIER_3_RATE,
  TIER_4_MIN,
  TIER_4_RATE,
} from "./constants";

export const RATE_MIN = 0.01;
export const RATE_MAX = 100;
export const RATE_INVALID_MESSAGE = "Rate must be between R0.01 and R100.00 per kWh";

/**
 * Helper to check if the current user is an admin.
 * @param ctx - The query or mutation context.
 * @returns The user's role if they are an admin, otherwise throws an error.
 */
async function checkAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const userRole = await ctx.db
    .query("user_roles")
    .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
    .unique();

  if (userRole?.role !== "admin") {
    throw new Error("Not authorized");
  }

  return { identity, userRole };
}

/**
 * Schedules recalculation for every (user, month) with a purchase dated on or after
 * `effectiveFrom`, so already-recorded purchases pick up the corrected/new rate.
 * Shared by `addRatePeriod` (a brand new tariff row) and `updateRate` (a correction
 * to an existing row) — both need the same "reprice everything from this date on"
 * behavior, and `recalculateMonthlyPurchases` re-derives each purchase's cost from
 * its own date via `selectActiveRates`, so this is safe even when a later tariff
 * period for the same tier supersedes the one being corrected.
 */
async function scheduleRepricingFrom(ctx: MutationCtx, effectiveFrom: string): Promise<number> {
  const purchases = await ctx.db.query("purchases").collect();
  const pairs = new Set<string>();
  for (const purchase of purchases) {
    if (purchase.date >= effectiveFrom) {
      pairs.add(`${purchase.userId} ${purchase.date.substring(0, DATE_MONTH_LENGTH)}`);
    }
  }
  for (const pair of pairs) {
    const [userId, monthKey] = pair.split(" ");
    if (!userId || !monthKey) continue;
    await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
      userId,
      monthKey,
    });
  }
  return pairs.size;
}

export const getRates = query({
  args: {},
  handler: async (ctx) => {
    const allRates = await ctx.db.query("electricity_rates").order("asc").collect();
    const today = todaySast();
    return selectActiveRates(allRates, today).sort((a, b) => a.tier_number - b.tier_number);
  },
});

/**
 * Returns every rate row ever inserted (all tariff periods), sorted by
 * effectiveFrom descending (most recent first) then tier_number ascending.
 * Public like getRates — tariffs are not sensitive, and the rates page shows
 * this history to every signed-in user.
 */
export const getRateHistory = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("electricity_rates").collect();
    return all.sort((a, b) => {
      const effectiveDiff = (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? "");
      if (effectiveDiff !== 0) return effectiveDiff;
      return a.tier_number - b.tier_number;
    });
  },
});

export const updateRate = mutation({
  args: {
    id: v.id("electricity_rates"),
    tier_label: v.optional(v.string()),
    min_units: v.optional(v.number()),
    max_units: v.optional(v.union(v.number(), v.null())),
    rate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { identity } = await checkAdmin(ctx);

    const oldRate = await ctx.db.get(args.id);
    if (oldRate === null) {
      throw new Error(`Rate not found: ${args.id}`);
    }

    const { id, rate, ...restUpdates } = args;

    if (rate !== undefined && (rate < RATE_MIN || rate > RATE_MAX)) {
      throw new Error(`Rate must be between R${RATE_MIN} and R${RATE_MAX} per kWh`);
    }

    const updates = { ...restUpdates, ...(rate !== undefined ? { rate } : {}) };
    if (Object.keys(updates).length === 0) return;

    await ctx.db.patch(id, updates);

    // Reprice already-recorded purchases if this change affects cost calculation
    // (rate, or tier boundaries) — a tier_label-only edit is cosmetic and skips this.
    const affectsCost =
      (rate !== undefined && rate !== oldRate.rate) ||
      (restUpdates.min_units !== undefined && restUpdates.min_units !== oldRate.min_units) ||
      (restUpdates.max_units !== undefined && restUpdates.max_units !== oldRate.max_units);

    const recalculatedMonths = affectsCost
      ? await scheduleRepricingFrom(ctx, oldRate.effectiveFrom ?? "")
      : 0;

    // Audit logging
    console.warn("[AUDIT] Rate updated", {
      updatedBy: identity.email ?? identity.tokenIdentifier,
      rateId: id,
      old: oldRate,
      updates,
      recalculatedMonths,
    });
  },
});

/**
 * Loads a new tariff period. Inserts one row per tier with the given effectiveFrom,
 * then schedules recalculation for every (user, month) that has purchases dated on
 * or after effectiveFrom so already-recorded purchases get repriced correctly.
 * This is the supported way to load a new tariff.
 */
export const addRatePeriod = mutation({
  args: {
    effectiveFrom: v.string(),
    rates: v.array(
      v.object({
        tier_number: v.number(),
        tier_label: v.string(),
        min_units: v.number(),
        max_units: v.union(v.number(), v.null()),
        rate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { identity } = await checkAdmin(ctx);

    for (const tier of args.rates) {
      if (tier.rate < RATE_MIN || tier.rate > RATE_MAX) {
        throw new Error(`Rate must be between R${RATE_MIN} and R${RATE_MAX} per kWh`);
      }
    }

    const existing = await ctx.db.query("electricity_rates").collect();
    if (existing.some((r) => r.effectiveFrom === args.effectiveFrom)) {
      throw new Error(`A rate period with effectiveFrom ${args.effectiveFrom} already exists`);
    }

    for (const tier of args.rates) {
      await ctx.db.insert("electricity_rates", { ...tier, effectiveFrom: args.effectiveFrom });
    }

    // Reprice every purchase recorded on or after the new period's start.
    const recalculatedMonths = await scheduleRepricingFrom(ctx, args.effectiveFrom);

    console.warn("[AUDIT] Rate period added", {
      addedBy: identity.email ?? identity.tokenIdentifier,
      effectiveFrom: args.effectiveFrom,
      rates: args.rates,
      recalculatedMonths,
    });
  },
});

// Seed function for rates (internal use or one-time)
export const seedRates = mutation({
  args: {},
  handler: async (ctx) => {
    const { identity } = await checkAdmin(ctx);

    const existing = await ctx.db.query("electricity_rates").collect();
    if (existing.length > 0) return;

    const TIERS = [
      {
        tier_number: 1,
        tier_label: "Tier 1",
        min_units: TIER_1_MIN,
        max_units: TIER_1_MAX,
        rate: TIER_1_RATE,
      },
      {
        tier_number: 2,
        tier_label: "Tier 2",
        min_units: TIER_2_MIN,
        max_units: TIER_2_MAX,
        rate: TIER_2_RATE,
      },
      {
        // eslint-disable-next-line llm-core/no-magic-numbers
        tier_number: 3,
        tier_label: "Tier 3",
        min_units: TIER_3_MIN,
        max_units: TIER_3_MAX,
        rate: TIER_3_RATE,
      },
      {
        // eslint-disable-next-line llm-core/no-magic-numbers
        tier_number: 4,
        tier_label: "Tier 4",
        min_units: TIER_4_MIN,
        max_units: null,
        rate: TIER_4_RATE,
      },
    ];

    for (const tier of TIERS) {
      // 2025/26 municipal tariff took effect 2025-07-01
      await ctx.db.insert("electricity_rates", { ...tier, effectiveFrom: "2025-07-01" });
    }

    console.warn("[AUDIT] Rates seeded", { seededBy: identity.email ?? identity.tokenIdentifier });
  },
});
