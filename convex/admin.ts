import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { calculateConsumptionStats } from "./electricity_logic";
import {
  EXPONENTIAL_DECAY_FACTOR,
  DEFAULT_PURCHASES_TAKE,
  DEFAULT_READINGS_TAKE,
  MAX_RECENT_PURCHASES,
  DEFAULT_THRESHOLD,
  DATE_MONTH_LENGTH,
  MAX_INTERVAL_READINGS,
  DEFAULT_PURCHASES_TO_SHOW,
} from "./constants";

type IntervalEntry = {
  newerDate: string;
  olderDate: string;
  daysDiff: number;
  newerReadingPre: number;
  olderReadingPost: number;
  usage: number;
  rate: number;
  isSkipped: boolean;
  weight: number;
};

type PurchaseReading = { date: string; readingPre: number; readingPost: number; source: string };

function computeIntervals(purchaseReadings: PurchaseReading[]): IntervalEntry[] {
  const intervals: IntervalEntry[] = [];
  for (let i = 0; i < purchaseReadings.length - 1; i++) {
    const newer = purchaseReadings[i];
    const older = purchaseReadings[i + 1];
    if (!newer || !older) continue;
    const daysDiff =
      (new Date(newer.date).getTime() - new Date(older.date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      const usage = older.readingPost - newer.readingPre;
      const rate = usage / daysDiff;
      intervals.push({
        newerDate: newer.date,
        olderDate: older.date,
        daysDiff,
        newerReadingPre: newer.readingPre,
        olderReadingPost: older.readingPost,
        usage,
        rate,
        isSkipped: rate < 0,
        weight: 0,
      });
    }
  }

  // Assign normalized weights to non-skipped intervals (exponential decay: most recent = highest)
  const validIntervals = intervals.filter((iv) => !iv.isSkipped);
  const rawWeights = validIntervals.map((_, i) => Math.pow(EXPONENTIAL_DECAY_FACTOR, i));
  const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
  let validIdx = 0;
  for (const iv of intervals) {
    if (!iv.isSkipped) {
      iv.weight = (rawWeights[validIdx] ?? 0) / totalWeight;
      validIdx++;
    }
  }

  return intervals;
}

async function fetchRecentPurchasesWithReadings(
  ctx: QueryCtx,
  userId: string
): Promise<
  {
    date: string;
    units: number;
    amountPaid: number;
    cost: number | undefined;
    readingPre: number | null;
    readingPost: number | null;
    effectiveRate: number | null;
  }[]
> {
  const docs = await ctx.db
    .query("purchases")
    .withIndex("by_userId_date", (q) => q.eq("userId", userId))
    .order("desc")
    .take(DEFAULT_PURCHASES_TAKE);

  const result = [];
  for (const purchase of docs) {
    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", purchase.date))
      .filter((q) => q.eq(q.field("source"), "purchase"))
      .take(1);
    const reading = readings[0];
    result.push({
      date: purchase.date,
      units: purchase.units,
      amountPaid: purchase.amountPaid,
      cost: purchase.cost,
      readingPre: reading?.readingPre ?? null,
      readingPost: reading?.readingPost ?? null,
      effectiveRate: purchase.units > 0 ? purchase.amountPaid / purchase.units : null,
    });
  }
  return result;
}

/**
 * Helper to check if the current user is an admin.
 * @returns The user's identity if they are an admin, otherwise throws an error.
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
    throw new Error("Not authorized: Admin only");
  }

  return identity;
}

export const getUsersList = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();
    const roles = await ctx.db.query("user_roles").collect();

    // Join profiles with roles
    return profiles.map((profile) => {
      const userRole = roles.find((r) => r.userId === profile.userId);
      return {
        ...profile,
        role: userRole?.role ?? "user",
      };
    });
  },
});

export const getGlobalStats = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const profiles = await ctx.db.query("profiles").collect();
    const purchases = await ctx.db.query("purchases").collect();

    const totalUsers = profiles.length;
    const totalUnits = purchases.reduce((sum, p) => sum + p.units, 0);
    const totalCost = purchases.reduce((sum, p) => sum + (p.cost || 0), 0);
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    return {
      totalUsers,
      totalUnits,
      totalCost,
      totalRevenue,
      avgUnitsPerUser: totalUsers > 0 ? totalUnits / totalUsers : 0,
    };
  },
});

export const getRecentPurchases = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const purchases = await ctx.db.query("purchases").order("desc").take(MAX_RECENT_PURCHASES);

    // Build a profile lookup map for user names
    const profiles = await ctx.db.query("profiles").collect();
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const result = [];
    for (const purchase of purchases) {
      // Fetch associated meter reading by userId + date + source=purchase
      const readings = await ctx.db
        .query("meter_readings")
        .withIndex("by_userId_date", (q) =>
          q.eq("userId", purchase.userId).eq("date", purchase.date)
        )
        .filter((q) => q.eq(q.field("source"), "purchase"))
        .take(1);

      const reading = readings[0];
      const profile = profileMap.get(purchase.userId);

      result.push({
        ...purchase,
        userName: profile?.preferredName ?? profile?.email ?? null,
        readingPre: reading?.readingPre ?? null,
        readingPost: reading?.readingPost ?? null,
        effectiveRate: purchase.units > 0 ? purchase.amountPaid / purchase.units : null,
      });
    }

    return result;
  },
});

async function fetchUserReadings(
  ctx: QueryCtx,
  userId: string
): Promise<{
  filtered: ((typeof allReadings)[number] & { source: "purchase" | "onboarding" })[];
  stats: ReturnType<typeof calculateConsumptionStats>;
  intervals: IntervalEntry[];
}> {
  const allReadings = await ctx.db
    .query("meter_readings")
    .withIndex("by_userId_date", (q) => q.eq("userId", userId))
    .order("desc")
    .take(DEFAULT_READINGS_TAKE);

  const filtered = allReadings.filter(
    (r): r is typeof r & { source: "purchase" | "onboarding" } =>
      r.source === "purchase" || r.source === "onboarding"
  );

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  const lowBalanceThreshold = profile?.lowBalanceThreshold ?? DEFAULT_THRESHOLD;
  const stats = calculateConsumptionStats(filtered, lowBalanceThreshold);

  const purchaseReadings = filtered
    .filter((r) => r.source === "purchase")
    .slice(0, MAX_INTERVAL_READINGS);
  const intervals = computeIntervals(purchaseReadings);

  return { filtered, stats, intervals };
}

async function fetchUserPurchaseData(
  ctx: QueryCtx,
  {
    userId,
    filteredReadings,
  }: {
    userId: string;
    filteredReadings: { source: string; date: string; readingPre: number; readingPost: number }[];
  }
) {
  const today = new Date().toISOString().split("T")[0] ?? "";
  const monthKey = today.substring(0, DATE_MONTH_LENGTH);
  const currentMonthPurchases = await ctx.db
    .query("purchases")
    .withIndex("by_userId_date", (q) =>
      q
        .eq("userId", userId)
        .gte("date", monthKey)
        .lt("date", monthKey + "-\uffff")
    )
    .collect();

  const recentPurchases = await fetchRecentPurchasesWithReadings(ctx, userId);

  return {
    currentMonthPurchases: currentMonthPurchases.map((p) => ({
      date: p.date,
      units: p.units,
      amountPaid: p.amountPaid,
      cost: p.cost,
    })),
    recentPurchases,
    readings: filteredReadings.slice(0, DEFAULT_PURCHASES_TO_SHOW).map((r) => ({
      date: r.date,
      readingPre: r.readingPre,
      readingPost: r.readingPost,
      source: r.source,
    })),
  };
}

export const getUserKPIData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const lowBalanceThreshold = profile?.lowBalanceThreshold ?? DEFAULT_THRESHOLD;

    const { filtered, stats, intervals } = await fetchUserReadings(ctx, args.userId);
    const purchaseData = await fetchUserPurchaseData(ctx, {
      userId: args.userId,
      filteredReadings: filtered,
    });

    return {
      profile: {
        lowBalanceThreshold,
        defaultDailyUsage: profile?.defaultDailyUsage ?? null,
      },
      stats,
      intervals,
      ...purchaseData,
    };
  },
});
