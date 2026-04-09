import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
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
    .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
    .unique();

  if (userRole?.role !== "admin") {
    throw new Error("Not authorized");
  }

  return { identity, userRole };
}

export const getRates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("electricity_rates").order("asc").collect();
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

    // Audit logging
    console.warn("[AUDIT] Rate updated", {
      updatedBy: identity.email ?? identity.subject,
      rateId: id,
      old: oldRate,
      updates,
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
      await ctx.db.insert("electricity_rates", tier);
    }

    console.warn("[AUDIT] Rates seeded", { seededBy: identity.email ?? identity.subject });
  },
});
