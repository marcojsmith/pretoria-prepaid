import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";
import { ensurePersonalHouseholdAndMeter, resolveMeter, requireHouseholdAdmin } from "./lib/meters";
import type { Id } from "./_generated/dataModel";

const ERR_NOT_AUTHENTICATED = "Not authenticated";
const ERR_PROFILE_NOT_FOUND = "Profile not found";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
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
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();

    return userRole?.role ?? "user";
  },
});

type SyncUserArgs = { email: string | null; preferredName?: string };

async function upsertSyncedProfile(options: {
  ctx: MutationCtx;
  tokenId: string;
  args: SyncUserArgs;
}): Promise<Id<"profiles">> {
  const { ctx, tokenId, args } = options;
  const existingProfile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", tokenId))
    .unique();

  if (!existingProfile) {
    const data: {
      userId: string;
      email: string | null;
      preferredName?: string;
    } = {
      userId: tokenId,
      email: args.email,
    };
    if (args.preferredName !== undefined) {
      data.preferredName = args.preferredName;
    }
    return await ctx.db.insert("profiles", data);
  }

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
  return existingProfile._id;
}

async function ensureBaseRole(ctx: MutationCtx, tokenId: string): Promise<void> {
  const existingRole = await ctx.db
    .query("user_roles")
    .withIndex("by_userId", (q) => q.eq("userId", tokenId))
    .unique();

  if (!existingRole) {
    await ctx.db.insert("user_roles", {
      userId: tokenId,
      role: "user",
    });
  }
}

export const syncUser = mutation({
  args: {
    email: v.union(v.string(), v.null()),
    preferredName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(ERR_NOT_AUTHENTICATED);
    }

    const tokenId = identity.tokenIdentifier;

    await checkRateLimit({
      ctx,
      userId: tokenId,
      action: "syncUser",
      limit: RATE_LIMITS.syncUser.limit,
      windowMs: RATE_LIMITS.syncUser.windowMs,
    });

    const profileId = await upsertSyncedProfile({ ctx, tokenId, args });
    await ensureBaseRole(ctx, tokenId);

    // Every user must always resolve to a meter — provision a personal
    // household + meter on first sync (idempotent on subsequent calls).
    const profile = await ctx.db.get(profileId);
    if (profile) {
      await ensurePersonalHouseholdAndMeter(ctx, tokenId, profile);
    }
  },
});

/**
 * Mirrors meter-related profile fields onto the caller's resolved meter, but
 * only when the caller is the admin of that meter's household. Members can
 * still edit their own profile copy (handled by the caller), but their edits
 * must not silently change shared meter settings — matching the current
 * Settings UX, which disables these fields for non-admin members.
 */
interface MirrorMeterFieldsArgs {
  meterNumber: string | undefined;
  lowBalanceThreshold: number | undefined;
  defaultDailyUsage: number | undefined;
}

async function mirrorMeterFields(options: {
  ctx: MutationCtx;
  tokenId: string;
  args: MirrorMeterFieldsArgs;
}): Promise<void> {
  const { ctx, tokenId, args } = options;
  if (
    args.meterNumber === undefined &&
    args.lowBalanceThreshold === undefined &&
    args.defaultDailyUsage === undefined
  ) {
    return;
  }

  const meter = await resolveMeter(ctx, tokenId);
  if (!meter) return;

  const membership = await requireHouseholdAdmin(ctx, meter.householdId, tokenId).catch(() => null);
  if (!membership) return;

  const meterUpdates: {
    meterNumber?: string;
    lowBalanceThreshold?: number;
    defaultDailyUsage?: number;
  } = {};
  if (args.meterNumber !== undefined) meterUpdates.meterNumber = args.meterNumber;
  if (args.lowBalanceThreshold !== undefined)
    meterUpdates.lowBalanceThreshold = args.lowBalanceThreshold;
  if (args.defaultDailyUsage !== undefined) meterUpdates.defaultDailyUsage = args.defaultDailyUsage;

  if (Object.keys(meterUpdates).length > 0) {
    await ctx.db.patch(meter._id, meterUpdates);
  }
}

type PushSubscriptionValue =
  | {
      endpoint: string;
      expirationTime: number | null;
      keys: { p256dh: string; auth: string };
    }
  | undefined;

interface UpdateProfileArgs {
  preferredName?: string;
  meterNumber?: string;
  lowBalanceThreshold?: number;
  defaultDailyUsage?: number;
  pushNotificationsEnabled?: boolean;
  pushSubscription?: PushSubscriptionValue | null;
}

function buildProfileUpdates(args: UpdateProfileArgs): {
  preferredName?: string;
  meterNumber?: string;
  lowBalanceThreshold?: number;
  defaultDailyUsage?: number;
  pushNotificationsEnabled?: boolean;
  pushSubscription?: PushSubscriptionValue;
} {
  const updates: ReturnType<typeof buildProfileUpdates> = {};
  if (args.preferredName !== undefined) updates.preferredName = args.preferredName;
  if (args.meterNumber !== undefined) updates.meterNumber = args.meterNumber;
  if (args.lowBalanceThreshold !== undefined)
    updates.lowBalanceThreshold = args.lowBalanceThreshold;
  if (args.defaultDailyUsage !== undefined) updates.defaultDailyUsage = args.defaultDailyUsage;
  if (args.pushNotificationsEnabled !== undefined)
    updates.pushNotificationsEnabled = args.pushNotificationsEnabled;

  if (args.pushSubscription !== null && args.pushSubscription !== undefined) {
    updates.pushSubscription = args.pushSubscription;
  } else if (args.pushSubscription === null) {
    updates.pushSubscription = undefined; // clears the field
  }
  return updates;
}

export const updateProfile = mutation({
  args: {
    preferredName: v.optional(v.string()),
    meterNumber: v.optional(v.string()),
    lowBalanceThreshold: v.optional(v.number()),
    defaultDailyUsage: v.optional(v.number()),
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

    const tokenId = identity.tokenIdentifier;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", tokenId))
      .unique();

    if (!profile) {
      throw new Error(ERR_PROFILE_NOT_FOUND);
    }

    const updates = buildProfileUpdates(args);
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(profile._id, updates);
    }

    await mirrorMeterFields({
      ctx,
      tokenId,
      args: {
        meterNumber: args.meterNumber,
        lowBalanceThreshold: args.lowBalanceThreshold,
        defaultDailyUsage: args.defaultDailyUsage,
      },
    });

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
  "cost-per-kwh-chart",
] as const;

const cardIdValidator = v.union(
  v.literal("consumption-stats"),
  v.literal("dashboard-stats"),
  v.literal("tier-progress"),
  v.literal("monthly-stats"),
  v.literal("yearly-chart"),
  v.literal("daily-chart"),
  v.literal("frequency-chart"),
  v.literal("cost-per-kwh-chart")
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
    const tokenId = identity.tokenIdentifier;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", tokenId))
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

    const tokenId = identity.tokenIdentifier;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", tokenId))
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
