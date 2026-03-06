import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal query to fetch all profiles with push enabled.
 */
export const getProfilesForAlerts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("pushNotificationsEnabled"), true))
      .collect();
  },
});

/**
 * Internal query to fetch stats for a specific user.
 */
export const getUserDataForAlert = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const readings = await ctx.db
      .query("meter_readings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(2);

    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return { readings, purchases };
  },
});

/**
 * Internal mutation to remove an expired/invalid push subscription.
 */
export const removeExpiredSubscription = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        pushSubscription: undefined,
        pushNotificationsEnabled: false,
      });
    }
  },
});

/**
 * Internal mutation to record when an alert was successfully sent.
 */
export const updateAlertTimestamp = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        lastAlertSent: Date.now(),
      });
    }
  },
});
