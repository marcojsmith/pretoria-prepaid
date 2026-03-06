import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

export const getRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userRole = await ctx.db
      .query("user_roles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    return userRole?.role ?? "user";
  },
});

export const syncUser = mutation({
  args: {
    email: v.union(v.string(), v.null()),
    preferredName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!existingProfile) {
      const data: {
        userId: string;
        email: string | null;
        preferredName?: string;
      } = {
        userId: identity.subject,
        email: args.email,
      };
      if (args.preferredName !== undefined) {
        data.preferredName = args.preferredName;
      }
      await ctx.db.insert("profiles", data);
    } else {
      const updates: {
        email?: string | null;
        preferredName?: string;
      } = {};
      if (existingProfile.email !== args.email) updates.email = args.email;
      // Only sync preferredName if it's not already set to avoid overwriting user edits
      if (!existingProfile.preferredName && args.preferredName)
        updates.preferredName = args.preferredName;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingProfile._id, updates);
      }
    }

    // Ensure they have a base role
    const existingRole = await ctx.db
      .query("user_roles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!existingRole) {
      await ctx.db.insert("user_roles", {
        userId: identity.subject,
        role: "user",
      });
    }
  },
});

export const updateProfile = mutation({
  args: {
    preferredName: v.optional(v.string()),
    meterNumber: v.optional(v.string()),
    monthlyBudget: v.optional(v.number()),
    lowBalanceThreshold: v.optional(v.number()),
    pushNotificationsEnabled: v.optional(v.boolean()),
    pushSubscription: v.optional(
      v.object({
        endpoint: v.string(),
        expirationTime: v.union(v.number(), v.null()),
        keys: v.object({
          p256dh: v.string(),
          auth: v.string(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const updates: {
      preferredName?: string;
      meterNumber?: string;
      monthlyBudget?: number;
      lowBalanceThreshold?: number;
      pushNotificationsEnabled?: boolean;
      pushSubscription?: any;
    } = {};
    if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
    if (args.meterNumber !== undefined) updates.meterNumber = args.meterNumber;
    if (args.monthlyBudget !== undefined) updates.monthlyBudget = args.monthlyBudget;
    if (args.lowBalanceThreshold !== undefined)
      updates.lowBalanceThreshold = args.lowBalanceThreshold;
    if (args.pushNotificationsEnabled !== undefined)
      updates.pushNotificationsEnabled = args.pushNotificationsEnabled;
    if (args.pushSubscription !== undefined) updates.pushSubscription = args.pushSubscription;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(profile._id, updates);
    }

    return profile._id;
  },
});

export const updatePushSubscription = mutation({
  args: {
    pushNotificationsEnabled: v.boolean(),
    pushSubscription: v.optional(
      v.object({
        endpoint: v.string(),
        expirationTime: v.union(v.number(), v.null()),
        keys: v.object({
          p256dh: v.string(),
          auth: v.string(),
        }),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!profile) throw new Error("Profile not found");

    const patch: {
      pushNotificationsEnabled: boolean;
      pushSubscription?: {
        endpoint: string;
        expirationTime: number | null;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
    } = {
      pushNotificationsEnabled: args.pushNotificationsEnabled,
    };

    if (args.pushSubscription !== undefined) {
      patch.pushSubscription = args.pushSubscription;
    }

    await ctx.db.patch(profile._id, patch);
  },
});
