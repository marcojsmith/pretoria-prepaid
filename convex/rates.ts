import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getRates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("electricity_rates").order("asc").collect();
  },
});

export const updateRate = mutation({
  args: {
    id: v.id("electricity_rates"),
    rate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (userRole?.role !== "admin") {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.id, { rate: args.rate });
  },
});

// Seed function for rates (internal use or one-time)
export const seedRates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("electricity_rates").collect();
    if (existing.length > 0) return;

    const TIERS = [
      { tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.42585 },
      { tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.00936 },
      { tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.36816 },
      { tier_number: 4, tier_label: "Tier 4", min_units: 651, max_units: null, rate: 4.70902 },
    ];

    for (const tier of TIERS) {
      await ctx.db.insert("electricity_rates", tier);
    }
  },
});
