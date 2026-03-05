import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { calculateTierBreakdown } from "./electricity_logic";

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

    // 2. Fetch all purchases for this user, then filter by month in JS
    const allUserPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const monthPurchases = allUserPurchases.filter((p) => p.date.startsWith(args.monthKey));

    // Sort by date (ascending) to maintain correct tier sequence
    const sortedPurchases = monthPurchases.sort((a, b) => a.date.localeCompare(b.date));

    let unitsAlreadyBought = 0;

    for (const purchase of sortedPurchases) {
      const { breakdown, total } = calculateTierBreakdown(
        purchase.units,
        unitsAlreadyBought,
        rates
      );

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

    return await ctx.db
      .query("purchases")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    if (args.units < 0 || args.cost < 0 || args.amountPaid < 0) {
      throw new Error("Values cannot be negative");
    }

    // Server-side calculation of initial breakdown
    const monthKey = args.date.substring(0, 7);
    const rates = await ctx.db.query("electricity_rates").collect();

    // Get units already bought this month before this date
    const allUserPurchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    const existingPurchases = allUserPurchases.filter(
      (p) => p.date.startsWith(monthKey) && p.date < args.date
    );

    const unitsBefore = existingPurchases.reduce((sum, p) => sum + p.units, 0);
    const { breakdown, total } = calculateTierBreakdown(args.units, unitsBefore, rates);

    const purchaseId = await ctx.db.insert("purchases", {
      userId: identity.subject,
      date: args.date,
      units: args.units,
      cost: total, // Use calculated theoretical cost
      amountPaid: args.amountPaid, // Store what they actually paid
      tierBreakdown: breakdown,
    });

    // Trigger sequential recalculation for the entire month to be safe
    await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
      userId: identity.subject,
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

    const purchase = await ctx.db.get(args.id);
    if (!purchase || purchase.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const monthKey = purchase.date.substring(0, 7);
    await ctx.db.delete(args.id);

    // Trigger recalculation for the month
    await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
      userId: identity.subject,
      monthKey,
    });
  },
});

/**
 * Triggers recalculation for all users in the system.
 * High-impact administrative operation.
 */
export const recalculateSystemWide = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Optional: Add admin check here if user_roles is populated
    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (userRole?.role !== "admin") {
      throw new Error("Not authorized: Admin only");
    }

    const allPurchases = await ctx.db.query("purchases").collect();
    const userMonths = new Map<string, Set<string>>();

    allPurchases.forEach((p) => {
      const monthKey = p.date.substring(0, 7);
      if (!userMonths.has(p.userId)) {
        userMonths.set(p.userId, new Set());
      }
      userMonths.get(p.userId)!.add(monthKey);
    });

    for (const [userId, months] of userMonths.entries()) {
      for (const monthKey of months) {
        await ctx.scheduler.runAfter(0, internal.purchases.recalculateMonthlyPurchases, {
          userId,
          monthKey,
        });
      }
    }

    return { usersProcessed: userMonths.size };
  },
});
