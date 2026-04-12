import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";

const ERR_NOT_AUTHENTICATED = "Not authenticated";
const ERR_PROFILE_NOT_FOUND = "Profile not found";

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
  // eslint-disable-next-line llm-core/max-function-length
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(ERR_NOT_AUTHENTICATED);
    }

    await checkRateLimit({
      ctx,
      userId: identity.subject,
      action: "syncUser",
      limit: RATE_LIMITS.syncUser.limit,
      windowMs: RATE_LIMITS.syncUser.windowMs,
    });

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
    lowBalanceThreshold: v.optional(v.number()),
    pushNotificationsEnabled: v.optional(v.boolean()),
    pushSubscription: v.optional(
      v.union(
        v.object({
          endpoint: v.string(),
          expirationTime: v.union(v.number(), v.null()),
          keys: v.object({
            p256dh: v.string(),
            auth: v.string(),
          }),
        }),
        v.null()
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(ERR_NOT_AUTHENTICATED);
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!profile) {
      throw new Error(ERR_PROFILE_NOT_FOUND);
    }

    const updates: {
      preferredName?: string;
      meterNumber?: string;
      lowBalanceThreshold?: number;
      pushNotificationsEnabled?: boolean;
      pushSubscription?:
        | {
            endpoint: string;
            expirationTime: number | null;
            keys: {
              p256dh: string;
              auth: string;
            };
          }
        | undefined;
    } = {};
    if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
    if (args.meterNumber !== undefined) updates.meterNumber = args.meterNumber;
    if (args.lowBalanceThreshold !== undefined)
      updates.lowBalanceThreshold = args.lowBalanceThreshold;
    if (args.pushNotificationsEnabled !== undefined)
      updates.pushNotificationsEnabled = args.pushNotificationsEnabled;

    if (args.pushSubscription !== null && args.pushSubscription !== undefined) {
      updates.pushSubscription = args.pushSubscription;
    } else if (args.pushSubscription === null) {
      updates.pushSubscription = undefined; // clears the field
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(profile._id, updates);
    }

    return profile._id;
  },
});

const ALLOWED_CARD_IDS = [
  "consumption-stats",
  "dashboard-stats",
  "tier-progress",
  "monthly-stats",
  "yearly-chart",
  "daily-chart",
  "frequency-chart",
] as const;

const cardIdValidator = v.union(
  v.literal("consumption-stats"),
  v.literal("dashboard-stats"),
  v.literal("tier-progress"),
  v.literal("monthly-stats"),
  v.literal("yearly-chart"),
  v.literal("daily-chart"),
  v.literal("frequency-chart")
);

export const updateDashboardLayout = mutation({
  args: {
    layout: v.array(v.object({ id: cardIdValidator, visible: v.boolean() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(ERR_NOT_AUTHENTICATED);
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
    if (!profile) {
      throw new Error(ERR_PROFILE_NOT_FOUND);
    }
    const ids = args.layout.map((c) => c.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ALLOWED_CARD_IDS.length || ids.length !== ALLOWED_CARD_IDS.length) {
      throw new Error("Dashboard layout must contain each card exactly once");
    }
    for (const required of ALLOWED_CARD_IDS) {
      if (!uniqueIds.has(required)) {
        throw new Error(`Dashboard layout is missing required card: ${required}`);
      }
    }
    await ctx.db.patch(profile._id, { dashboardLayout: args.layout });
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
    if (!identity) throw new Error(ERR_NOT_AUTHENTICATED);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!profile) throw new Error(ERR_PROFILE_NOT_FOUND);

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
