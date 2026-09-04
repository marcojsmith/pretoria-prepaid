import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { calculateConsumptionStats } from "./electricity_logic";
import { DEFAULT_READINGS_TAKE, DEFAULT_LOW_BALANCE_THRESHOLD } from "./constants";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";
import { resolveEffectiveUserId } from "./lib/household";
import { resolveMeter } from "./lib/meters";
import { todaySast } from "./lib/date";
import type { Doc } from "./_generated/dataModel";

const meterIdArg = { meterId: v.optional(v.id("meters")) };

export const getReadings = query({
  args: meterIdArg,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);
    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

    if (meter) {
      const meterScoped = await ctx.db
        .query("meter_readings")
        .withIndex("by_meterId_date", (q) => q.eq("meterId", meter._id))
        .order("desc")
        .take(DEFAULT_READINGS_TAKE);

      const legacyUnmigrated = (
        await ctx.db
          .query("meter_readings")
          .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
          .order("desc")
          .take(DEFAULT_READINGS_TAKE)
      ).filter((r) => r.meterId === undefined);

      return [...meterScoped, ...legacyUnmigrated]
        .sort((a, b) => b.date.localeCompare(a.date) || b._creationTime - a._creationTime)
        .slice(0, DEFAULT_READINGS_TAKE);
    }

    return await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .take(DEFAULT_READINGS_TAKE);
  },
});

interface OnboardingReadingArgs {
  reading: number;
  defaultDailyUsage?: number;
}

async function addOnboardingReadingOnMeter(options: {
  ctx: MutationCtx;
  meter: Doc<"meters">;
  effectiveUserId: string;
  args: OnboardingReadingArgs;
}) {
  const { ctx, meter, effectiveUserId, args } = options;
  const existingReadings = await ctx.db
    .query("meter_readings")
    .withIndex("by_meterId_date", (q) => q.eq("meterId", meter._id))
    .take(1);

  const todayStr = todaySast();
  const existing = existingReadings[0];

  if (existing) {
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
    await ctx.db.insert("meter_readings", {
      userId: effectiveUserId,
      meterId: meter._id,
      date: todayStr,
      readingPre: args.reading,
      readingPost: args.reading,
      source: "onboarding",
    });
  }

  if (args.defaultDailyUsage !== undefined) {
    await ctx.db.patch(meter._id, { defaultDailyUsage: args.defaultDailyUsage });
  }
}

async function addOnboardingReadingLegacy(options: {
  ctx: MutationCtx;
  effectiveUserId: string;
  args: OnboardingReadingArgs;
}) {
  const { ctx, effectiveUserId, args } = options;
  const existingReadings = await ctx.db
    .query("meter_readings")
    .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
    .take(1);

  const todayStr = todaySast();
  const existing = existingReadings[0];

  if (existing) {
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
    await ctx.db.insert("meter_readings", {
      userId: effectiveUserId,
      date: todayStr,
      readingPre: args.reading,
      readingPost: args.reading,
      source: "onboarding",
    });
  }

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
}

export const addOnboardingReading = mutation({
  args: {
    reading: v.number(),
    defaultDailyUsage: v.optional(v.number()),
    meterId: v.optional(v.id("meters")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await checkRateLimit({
      ctx,
      userId: identity.tokenIdentifier,
      action: "addOnboardingReading",
      limit: RATE_LIMITS.addOnboardingReading.limit,
      windowMs: RATE_LIMITS.addOnboardingReading.windowMs,
    });

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);

    if (meter) {
      await addOnboardingReadingOnMeter({ ctx, meter, effectiveUserId, args });
    } else {
      await addOnboardingReadingLegacy({ ctx, effectiveUserId, args });
    }

    return null;
  },
});

export const hasAnyReadings = query({
  args: meterIdArg,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);
    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

    if (meter) {
      const meterScoped = await ctx.db
        .query("meter_readings")
        .withIndex("by_meterId_date", (q) => q.eq("meterId", meter._id))
        .take(1);
      if (meterScoped.length > 0) return true;

      const legacyUnmigrated = (
        await ctx.db
          .query("meter_readings")
          .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
          .collect()
      ).filter((r) => r.meterId === undefined);
      return legacyUnmigrated.length > 0;
    }

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .take(1);

    return readings.length > 0;
  },
});

export const hasPurchaseReadings = query({
  args: meterIdArg,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);
    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

    if (meter) {
      const meterScoped = await ctx.db
        .query("meter_readings")
        .withIndex("by_meterId_source", (q) => q.eq("meterId", meter._id).eq("source", "purchase"))
        .take(1);
      if (meterScoped.length > 0) return true;

      const legacyUnmigrated = (
        await ctx.db
          .query("meter_readings")
          .withIndex("by_userId_source", (q) =>
            q.eq("userId", effectiveUserId).eq("source", "purchase")
          )
          .collect()
      ).filter((r) => r.meterId === undefined);
      return legacyUnmigrated.length > 0;
    }

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_source", (q) =>
        q.eq("userId", effectiveUserId).eq("source", "purchase")
      )
      .take(1);

    return readings.length > 0;
  },
});

function filterStatsReadings(readings: Doc<"meter_readings">[]) {
  return readings.filter(
    (r): r is typeof r & { source: "purchase" | "onboarding" | "correction" } =>
      r.source === "purchase" || r.source === "onboarding" || r.source === "correction"
  );
}

export const getConsumptionStats = query({
  args: meterIdArg,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);
    if (meter) {
      const lowBalanceThreshold = meter.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;
      const effectiveUserIdForMeter = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);

      const meterScoped = await ctx.db
        .query("meter_readings")
        .withIndex("by_meterId_date", (q) => q.eq("meterId", meter._id))
        .order("desc")
        .take(DEFAULT_READINGS_TAKE);

      const legacyUnmigrated = (
        await ctx.db
          .query("meter_readings")
          .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserIdForMeter))
          .order("desc")
          .take(DEFAULT_READINGS_TAKE)
      ).filter((r) => r.meterId === undefined);

      const readings = [...meterScoped, ...legacyUnmigrated]
        .sort((a, b) => b.date.localeCompare(a.date) || b._creationTime - a._creationTime)
        .slice(0, DEFAULT_READINGS_TAKE);

      return calculateConsumptionStats(filterStatsReadings(readings), lowBalanceThreshold);
    }

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .unique();

    const lowBalanceThreshold = profile?.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD;

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", effectiveUserId))
      .order("desc")
      .take(DEFAULT_READINGS_TAKE);

    return calculateConsumptionStats(filterStatsReadings(readings), lowBalanceThreshold);
  },
});

const MIN_METER_READING = 0;
const MAX_METER_READING = 100000;

/**
 * Records a manual correction to the user's meter balance — used when the user's
 * actual meter reading differs from the app's estimate (e.g. after checking the
 * physical meter). Inserted as a new reading dated today so it becomes the anchor
 * for future balance estimates, without affecting the daily burn rate (which is
 * only computed from "purchase" readings).
 */
export const correctMeterReading = mutation({
  args: {
    reading: v.number(),
    meterId: v.optional(v.id("meters")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (args.reading < MIN_METER_READING || args.reading > MAX_METER_READING) {
      throw new Error(`Reading must be between ${MIN_METER_READING} and ${MAX_METER_READING} kWh`);
    }

    await checkRateLimit({
      ctx,
      userId: identity.tokenIdentifier,
      action: "correctMeterReading",
      limit: RATE_LIMITS.correctMeterReading.limit,
      windowMs: RATE_LIMITS.correctMeterReading.windowMs,
    });

    const todayStr = todaySast();
    const meter = await resolveMeter(ctx, identity.tokenIdentifier, args.meterId);

    if (meter) {
      const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
      await ctx.db.insert("meter_readings", {
        userId: effectiveUserId,
        meterId: meter._id,
        date: todayStr,
        readingPre: args.reading,
        readingPost: args.reading,
        source: "correction",
      });
      return null;
    }

    const effectiveUserId = await resolveEffectiveUserId(ctx, identity.tokenIdentifier);
    await ctx.db.insert("meter_readings", {
      userId: effectiveUserId,
      date: todayStr,
      readingPre: args.reading,
      readingPost: args.reading,
      source: "correction",
    });

    return null;
  },
});
