import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getReadings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const addReading = mutation({
  args: {
    date: v.string(),
    reading: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await ctx.db.insert("meter_readings", {
      userId: identity.subject,
      date: args.date,
      reading: args.reading,
    });
  },
});

export const deleteReading = mutation({
  args: { id: v.id("meter_readings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const reading = await ctx.db.get(args.id);
    if (!reading || reading.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
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

    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(2);

    if (readings.length === 0) return null;

    const lastReading = readings[0];
    let dailyBurnRate = 0;

    if (readings.length >= 2) {
      const prevReading = readings[1];
      const date1 = new Date(lastReading.date);
      const date2 = new Date(prevReading.date);
      const daysDiff = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 0) {
        // Fetch purchases between these two readings
        const purchases = await ctx.db
          .query("purchases")
          .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
          .collect();

        const purchasesBetween = purchases.filter(
          (p) => p.date > prevReading.date && p.date <= lastReading.date
        );

        const totalPurchased = purchasesBetween.reduce((sum, p) => sum + p.units, 0);

        // Usage = (Previous Reading + Purchases) - Current Reading
        const usage = prevReading.reading + totalPurchased - lastReading.reading;
        dailyBurnRate = usage / daysDiff;
      }
    }

    // Estimate current balance based on last reading and time passed
    const now = new Date();
    const lastReadingDate = new Date(lastReading.date);
    const daysSinceLastReading =
      (now.getTime() - lastReadingDate.getTime()) / (1000 * 60 * 60 * 24);

    // Default burn rate if we don't have enough data (e.g. 10 kWh/day)
    const effectiveBurnRate = dailyBurnRate > 0 ? dailyBurnRate : 10;
    const estimatedUsageSinceLast = Math.max(0, daysSinceLastReading * effectiveBurnRate);
    const estimatedBalance = Math.max(0, lastReading.reading - estimatedUsageSinceLast);

    // Days until we hit ZERO
    const daysRemaining = effectiveBurnRate > 0 ? estimatedBalance / effectiveBurnRate : 0;

    // Days until we hit the LOW threshold (the beep)
    const daysRemainingUntilLow =
      effectiveBurnRate > 0
        ? Math.max(0, (estimatedBalance - lowBalanceThreshold) / effectiveBurnRate)
        : 0;

    return {
      lastReading: lastReading.reading,
      lastReadingDate: lastReading.date,
      dailyBurnRate,
      estimatedBalance,
      daysRemaining,
      daysRemainingUntilLow,
      lowBalanceThreshold,
      isEstimatedBurnRate: dailyBurnRate === 0,
    };
  },
});
