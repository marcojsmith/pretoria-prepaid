import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getMembership, requireHouseholdAdmin } from "./lib/meters";
import type { Doc, Id } from "./_generated/dataModel";

const TAKE_MEMBERSHIPS = 20;
const ERR_NOT_AUTHENTICATED = "Not authenticated";

const listedMeterValidator = v.object({
  meterId: v.id("meters"),
  householdId: v.id("households"),
  householdName: v.string(),
  name: v.string(),
  meterNumber: v.optional(v.string()),
  lowBalanceThreshold: v.optional(v.number()),
  defaultDailyUsage: v.optional(v.number()),
  isActive: v.boolean(),
  myRole: v.union(v.literal("admin"), v.literal("member")),
});

interface ListedMeter {
  meterId: Id<"meters">;
  householdId: Id<"households">;
  householdName: string;
  name: string;
  meterNumber?: string;
  lowBalanceThreshold?: number;
  defaultDailyUsage?: number;
  isActive: boolean;
  myRole: "admin" | "member";
}

async function listMetersForMembership(options: {
  ctx: QueryCtx;
  membership: Doc<"household_members">;
  activeMeterId: Id<"meters"> | undefined;
}): Promise<ListedMeter[]> {
  const { ctx, membership, activeMeterId } = options;
  const household = await ctx.db.get(membership.householdId);
  if (!household) return [];

  const meters = await ctx.db
    .query("meters")
    .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
    .collect();

  return meters
    .filter((m) => !m.archived)
    .map((m) => {
      const entry: ListedMeter = {
        meterId: m._id,
        householdId: membership.householdId,
        householdName: household.name,
        name: m.name,
        isActive: activeMeterId === m._id,
        myRole: membership.role,
      };
      if (m.meterNumber !== undefined) entry.meterNumber = m.meterNumber;
      if (m.lowBalanceThreshold !== undefined) entry.lowBalanceThreshold = m.lowBalanceThreshold;
      if (m.defaultDailyUsage !== undefined) entry.defaultDailyUsage = m.defaultDailyUsage;
      return entry;
    });
}

export const listMyMeters = query({
  args: {},
  returns: v.array(listedMeterValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();

    const memberships = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(TAKE_MEMBERSHIPS);

    const results = [];
    for (const membership of memberships) {
      const meters = await listMetersForMembership({
        ctx,
        membership,
        activeMeterId: profile?.activeMeterId,
      });
      results.push(...meters);
    }
    return results;
  },
});

export const addMeter = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    meterNumber: v.optional(v.string()),
  },
  returns: v.id("meters"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTHENTICATED);

    await requireHouseholdAdmin(ctx, args.householdId, identity.tokenIdentifier);

    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Meter name cannot be empty");

    const newMeter: {
      householdId: Id<"households">;
      name: string;
      createdAt: number;
      meterNumber?: string;
    } = {
      householdId: args.householdId,
      name: trimmedName,
      createdAt: Date.now(),
    };
    if (args.meterNumber !== undefined) newMeter.meterNumber = args.meterNumber;

    const meterId = await ctx.db.insert("meters", newMeter);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (profile && !profile.activeMeterId) {
      await ctx.db.patch(profile._id, { activeMeterId: meterId });
    }

    return meterId;
  },
});

export const updateMeter = mutation({
  args: {
    meterId: v.id("meters"),
    name: v.optional(v.string()),
    meterNumber: v.optional(v.string()),
    lowBalanceThreshold: v.optional(v.number()),
    defaultDailyUsage: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTHENTICATED);

    const meter = await ctx.db.get(args.meterId);
    if (!meter) throw new Error("Meter not found");

    await requireHouseholdAdmin(ctx, meter.householdId, identity.tokenIdentifier);

    const updates: {
      name?: string;
      meterNumber?: string;
      lowBalanceThreshold?: number;
      defaultDailyUsage?: number;
    } = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) throw new Error("Meter name cannot be empty");
      updates.name = trimmedName;
    }
    if (args.meterNumber !== undefined) updates.meterNumber = args.meterNumber;
    if (args.lowBalanceThreshold !== undefined)
      updates.lowBalanceThreshold = args.lowBalanceThreshold;
    if (args.defaultDailyUsage !== undefined) updates.defaultDailyUsage = args.defaultDailyUsage;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.meterId, updates);
    }

    return null;
  },
});

const TAKE_HOUSEHOLD_MEMBERS = 200;

export const archiveMeter = mutation({
  args: { meterId: v.id("meters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTHENTICATED);

    const meter = await ctx.db.get(args.meterId);
    if (!meter) throw new Error("Meter not found");

    await requireHouseholdAdmin(ctx, meter.householdId, identity.tokenIdentifier);

    await ctx.db.patch(args.meterId, { archived: true });

    const members = await ctx.db
      .query("household_members")
      .withIndex("by_householdId", (q) => q.eq("householdId", meter.householdId))
      .take(TAKE_HOUSEHOLD_MEMBERS);

    for (const member of members) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", member.userId))
        .unique();
      if (profile?.activeMeterId === args.meterId) {
        await ctx.db.patch(profile._id, { activeMeterId: undefined });
      }
    }

    return null;
  },
});

export const setActiveMeter = mutation({
  args: { meterId: v.id("meters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTHENTICATED);

    const meter = await ctx.db.get(args.meterId);
    if (!meter || meter.archived) throw new Error("Unauthorized");

    const membership = await getMembership(ctx, meter.householdId, identity.tokenIdentifier);
    if (!membership) throw new Error("Unauthorized");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, { activeMeterId: args.meterId });

    return null;
  },
});
