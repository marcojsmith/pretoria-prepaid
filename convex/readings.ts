import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateConsumptionStats } from "./electricity_logic";
import { DEFAULT_READINGS_TAKE, DEFAULT_LOW_BALANCE_THRESHOLD } from "./constants";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";
import { resolveEffectiveUserId } from "./lib/household";

export const getReadings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.subject);

    return await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .take(DEFAULT_READINGS_TAKE);
  },
});

export const addOnboardingReading = mutation({
  args: {
    reading: v.number(),
    defaultDailyUsage: v.optional(v.number()),
  },
  // eslint-disable-next-line llm-core/max-function-length
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await checkRateLimit({
      ctx,
      userId: identity.subject,
      action: "addOnboardingReading",
      limit: RATE_LIMITS.addOnboardingReading.limit,
      windowMs: RATE_LIMITS.addOnboardingReading.windowMs,
    });

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.subject);

    // Check if user already has any readings
    const existingReadings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .take(1);

    const todayStr = new Date().toISOString().split("T")[0] ?? "";

    const existing = existingReadings[0];
    if (existing) {
      // Check if it's an onboarding reading — overwrite it (idempotent)
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
        userId: effectiveUserId,
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
        .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
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

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.subject);

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .take(1);

    return readings.length > 0;
  },
});

export const hasPurchaseReadings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.subject);

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_source", (q) =>
        q.eq("userId", effectiveUserId).eq("source", "purchase")
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

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.subject);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .unique();

    const lowBalanceThreshold = profile?.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;

    // Fetch all readings, sorted by date desc
    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .take(DEFAULT_READINGS_TAKE);

    const filteredReadings = readings.filter(
      (r): r is typeof r & { source: "purchase" | "onboarding" } =>
        r.source === "purchase" || r.source === "onboarding"
    );
    return calculateConsumptionStats(filteredReadings, lowBalanceThreshold);
  },
});
