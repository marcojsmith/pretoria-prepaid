import { query } from "./_generated/server";
import { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { calculateConsumptionStats } from "./electricity_logic";

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

    const purchases = await ctx.db.query("purchases").order("desc").take(50);

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

export const getUserKPIData = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    const lowBalanceThreshold = profile?.lowBalanceThreshold ?? 10;

    const allReadings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    const filteredReadings = allReadings.filter(
      (r): r is typeof r & { source: "purchase" | "onboarding" } =>
        r.source === "purchase" || r.source === "onboarding"
    );

    const stats = calculateConsumptionStats(filteredReadings, lowBalanceThreshold);

    // Compute interval breakdown for daily usage explanation (up to 5 intervals = 6 readings)
    const purchaseReadings = filteredReadings.filter((r) => r.source === "purchase").slice(0, 6);

    const intervals: {
      newerDate: string;
      olderDate: string;
      daysDiff: number;
      newerReadingPre: number;
      olderReadingPost: number;
      usage: number;
      rate: number;
      isSkipped: boolean;
      weight: number;
    }[] = [];

    for (let i = 0; i < purchaseReadings.length - 1; i++) {
      const newer = purchaseReadings[i];
      const older = purchaseReadings[i + 1];
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
    const rawWeights = validIntervals.map((_, i) => Math.pow(0.5, i));
    const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
    let validIdx = 0;
    for (const iv of intervals) {
      if (!iv.isSkipped) {
        iv.weight = rawWeights[validIdx] / totalWeight;
        validIdx++;
      }
    }

    // Current month purchases
    const today = new Date().toISOString().split("T")[0];
    const monthKey = today.substring(0, 7);
    const currentMonthPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId_date", (q) =>
        q
          .eq("userId", args.userId)
          .gte("date", monthKey)
          .lt("date", monthKey + "-\uffff")
      )
      .collect();

    // Last 12 purchases with associated meter readings
    const recentPurchasesDocs = await ctx.db
      .query("purchases")
      .withIndex("by_userId_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(12);

    const recentPurchases = [];
    for (const purchase of recentPurchasesDocs) {
      const readings = await ctx.db
        .query("meter_readings")
        .withIndex("by_userId_date", (q) => q.eq("userId", args.userId).eq("date", purchase.date))
        .filter((q) => q.eq(q.field("source"), "purchase"))
        .take(1);
      const reading = readings[0];
      recentPurchases.push({
        date: purchase.date,
        units: purchase.units,
        amountPaid: purchase.amountPaid,
        cost: purchase.cost,
        readingPre: reading?.readingPre ?? null,
        readingPost: reading?.readingPost ?? null,
        effectiveRate: purchase.units > 0 ? purchase.amountPaid / purchase.units : null,
      });
    }

    return {
      profile: {
        lowBalanceThreshold,
        defaultDailyUsage: profile?.defaultDailyUsage ?? null,
      },
      stats,
      readings: filteredReadings.slice(0, 7).map((r) => ({
        date: r.date,
        readingPre: r.readingPre,
        readingPost: r.readingPost,
        source: r.source,
      })),
      intervals,
      currentMonthPurchases: currentMonthPurchases.map((p) => ({
        date: p.date,
        units: p.units,
        amountPaid: p.amountPaid,
        cost: p.cost,
      })),
      recentPurchases,
    };
  },
});
