import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateConsumptionStats } from "./electricity_logic";

export const getReadings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(100);
  },
});

export const addOnboardingReading = mutation({
  args: {
    reading: v.number(),
    defaultDailyUsage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user already has any readings
    const existingReadings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .take(1);

    const todayStr = new Date().toISOString().split("T")[0];

    if (existingReadings.length > 0) {
      // Check if it's an onboarding reading — overwrite it (idempotent)
      const existing = existingReadings[0];
      if (existing.source === "onboarding") {
        await ctx.db.patch(existing._id, {
          readingPre: args.reading,
          readingPost: args.reading,
          date: todayStr,
        });
      } else {
        throw new Error("User already has purchase readings. Cannot add onboarding reading.");
      }
    } else {
      // No readings exist — create new onboarding reading
      await ctx.db.insert("meter_readings", {
        userId: identity.subject,
        date: todayStr,
        readingPre: args.reading,
        readingPost: args.reading,
        source: "onboarding",
      });
    }

    // Update profile with defaultDailyUsage if provided
    if (args.defaultDailyUsage !== undefined) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .unique();

      if (profile) {
        await ctx.db.patch(profile._id, {
          defaultDailyUsage: args.defaultDailyUsage,
        });
      }
    }

    return null;
  },
});

export const hasAnyReadings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .take(1);

    return readings.length > 0;
  },
});

export const hasPurchaseReadings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_source", (q) =>
        q.eq("userId", identity.subject).eq("source", "purchase")
      )
      .take(1);

    return readings.length > 0;
  },
});

export const getConsumptionStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    const lowBalanceThreshold = profile?.lowBalanceThreshold ?? 10;

    // Fetch all readings, sorted by date desc
    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(100);

    const filteredReadings = readings.filter(
      (r): r is typeof r & { source: "purchase" | "onboarding" } =>
        r.source === "purchase" || r.source === "onboarding"
    );
    return calculateConsumptionStats(filteredReadings, lowBalanceThreshold);
  },
});
