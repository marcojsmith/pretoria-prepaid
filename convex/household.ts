import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const ERR_NOT_AUTH = "Not authenticated";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_CODE_LENGTH = 8;
const TAKE_HOUSEHOLD_METERS = 10;
const TAKE_DISBAND_METERS = 200;

export const getMyHousehold = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const membership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!membership) return null;

    const household = await ctx.db.get(membership.householdId);
    if (!household) return null;

    const members = await ctx.db
      .query("household_members")
      .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
      .collect();

    const memberProfiles = await Promise.all(
      members.map(async (m) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", m.userId))
          .unique();
        return {
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          preferredName: profile?.preferredName ?? null,
          email: profile?.email ?? null,
        };
      })
    );

    const allMeters = await ctx.db
      .query("meters")
      .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
      .collect();
    const meters = allMeters
      .filter((m) => !m.archived)
      .map((m) => ({
        meterId: m._id,
        name: m.name,
        meterNumber: m.meterNumber,
        archived: m.archived ?? false,
      }));

    return {
      householdId: household._id,
      name: household.name,
      adminUserId: household.adminUserId,
      myRole: membership.role,
      members: memberProfiles,
      meters,
    };
  },
});

export const getInviteByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("household_invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!invite) return null;

    const household = await ctx.db.get(invite.householdId);
    const adminProfile = household
      ? await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", household.adminUserId))
          .unique()
      : null;

    return {
      valid: !invite.revoked && !invite.usedBy && invite.expiresAt > Date.now(),
      expired: invite.expiresAt <= Date.now(),
      used: !!invite.usedBy,
      revoked: !!invite.revoked,
      householdName: household?.name ?? null,
      adminName: adminProfile?.preferredName ?? "Household admin",
    };
  },
});

export const getMyInvites = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const membership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!membership || membership.role !== "admin") return [];

    return await ctx.db
      .query("household_invites")
      .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
      .collect();
  },
});

export const createHousehold = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    const existing = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (existing) throw new Error("Already in a household");

    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Household name cannot be empty");

    const householdId = await ctx.db.insert("households", {
      adminUserId: identity.tokenIdentifier,
      name: trimmedName,
      createdAt: Date.now(),
    });

    await ctx.db.insert("household_members", {
      householdId,
      userId: identity.tokenIdentifier,
      role: "admin",
      joinedAt: Date.now(),
    });

    const meterId = await ctx.db.insert("meters", {
      householdId,
      name: "Home",
      createdAt: Date.now(),
    });

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (profile && !profile.activeMeterId) {
      await ctx.db.patch(profile._id, { activeMeterId: meterId });
    }

    return householdId;
  },
});

export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    const membership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!membership || membership.role !== "admin") throw new Error("Not a household admin");

    const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codeBytes = new Uint8Array(INVITE_CODE_LENGTH);
    let code = "";
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      crypto.getRandomValues(codeBytes);
      const randomChars: string[] = [];
      for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        const char = CHARSET[(codeBytes[i] ?? 0) % CHARSET.length];
        if (char) randomChars.push(char);
      }
      code = randomChars.join("");

      const existing = await ctx.db
        .query("household_invites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique invite code. Please try again.");
    }

    await ctx.db.insert("household_invites", {
      householdId: membership.householdId,
      code,
      createdBy: identity.tokenIdentifier,
      createdAt: Date.now(),
      expiresAt: Date.now() + SEVEN_DAYS_MS,
    });

    return code;
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("household_invites") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    const membership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (
      !membership ||
      membership.role !== "admin" ||
      membership.householdId !== invite.householdId
    ) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.inviteId, { revoked: true });
  },
});

export const joinHousehold = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    const existingMembership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (existingMembership) throw new Error("Already in a household");

    const invite = await ctx.db
      .query("household_invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!invite) throw new Error("Invalid invite code");
    if (invite.revoked) throw new Error("Invite has been revoked");
    if (invite.usedBy) throw new Error("Invite has already been used");
    if (invite.expiresAt <= Date.now()) throw new Error("Invite has expired");

    await ctx.db.patch(invite._id, {
      usedBy: identity.tokenIdentifier,
      usedAt: Date.now(),
    });

    await ctx.db.insert("household_members", {
      householdId: invite.householdId,
      userId: identity.tokenIdentifier,
      role: "member",
      joinedAt: Date.now(),
    });

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (profile && !profile.activeMeterId) {
      const householdMeters = await ctx.db
        .query("meters")
        .withIndex("by_householdId", (q) => q.eq("householdId", invite.householdId))
        .take(TAKE_HOUSEHOLD_METERS);
      const firstMeter = householdMeters.find((m) => !m.archived);
      if (firstMeter) {
        await ctx.db.patch(profile._id, { activeMeterId: firstMeter._id });
      }
    }

    return invite.householdId;
  },
});

export const removeMember = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    if (args.userId === identity.tokenIdentifier) throw new Error("Cannot remove yourself");

    const adminMembership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!adminMembership || adminMembership.role !== "admin") throw new Error("Not admin");

    const targetMembership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!targetMembership || targetMembership.householdId !== adminMembership.householdId) {
      throw new Error("User not in your household");
    }

    await ctx.db.delete(targetMembership._id);
  },
});

export const leaveHousehold = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    const membership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!membership) throw new Error("Not in a household");
    if (membership.role === "admin")
      throw new Error("Admin cannot leave. Disband the household instead.");

    await ctx.db.delete(membership._id);
  },
});

export const disbandHousehold = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error(ERR_NOT_AUTH);

    const membership = await ctx.db
      .query("household_members")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .unique();
    if (!membership || membership.role !== "admin") throw new Error("Not admin");

    const allMembers = await ctx.db
      .query("household_members")
      .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
      .collect();

    // Meters cannot exist without a household (householdId is required in the
    // schema), so when the household is disbanded its meters must be deleted
    // too. Any former member whose activeMeterId pointed at one of these
    // meters must have that reference cleared, mirroring the cleanup done in
    // meters.archiveMeter.
    const householdMeters = await ctx.db
      .query("meters")
      .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
      .take(TAKE_DISBAND_METERS);
    const meterIds = new Set(householdMeters.map((m) => m._id));

    for (const m of allMembers) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", m.userId))
        .unique();
      if (profile?.activeMeterId && meterIds.has(profile.activeMeterId)) {
        await ctx.db.patch(profile._id, { activeMeterId: undefined });
      }
    }

    for (const meter of householdMeters) await ctx.db.delete(meter._id);

    for (const m of allMembers) await ctx.db.delete(m._id);

    const allInvites = await ctx.db
      .query("household_invites")
      .withIndex("by_householdId", (q) => q.eq("householdId", membership.householdId))
      .collect();
    for (const inv of allInvites) await ctx.db.delete(inv._id);

    await ctx.db.delete(membership.householdId);
  },
});
