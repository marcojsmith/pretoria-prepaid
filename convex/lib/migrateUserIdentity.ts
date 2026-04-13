import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type MigrateUserIdentityOptions = {
  ctx: MutationCtx;
  subjectId: string;
  tokenId: string;
};

type MigrateTableOptions = {
  ctx: MutationCtx;
  table: "purchases" | "meter_readings";
  subjectId: string;
  tokenId: string;
};

type MigrateInvitesOptions = {
  ctx: MutationCtx;
  householdId: Id<"households">;
  subjectId: string;
  tokenId: string;
};

/**
 * Migrates all user records keyed by `subjectId` to `tokenId`.
 * Called from syncUser when a legacy subject-keyed profile is detected.
 * LEGACY: Remove this file once all users have migrated.
 */
export async function migrateUserIdentity(options: MigrateUserIdentityOptions): Promise<void> {
  const { ctx, subjectId, tokenId } = options;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", subjectId))
    .unique();
  if (profile) {
    await ctx.db.patch(profile._id, { userId: tokenId });
  }

  const role = await ctx.db
    .query("user_roles")
    .withIndex("by_userId", (q) => q.eq("userId", subjectId))
    .unique();
  if (role) {
    await ctx.db.patch(role._id, { userId: tokenId });
  }

  const membership = await ctx.db
    .query("household_members")
    .withIndex("by_userId", (q) => q.eq("userId", subjectId))
    .unique();
  if (membership) {
    await ctx.db.patch(membership._id, { userId: tokenId });

    const household = await ctx.db.get(membership.householdId);
    if (household && household.adminUserId === subjectId) {
      await ctx.db.patch(membership.householdId, { adminUserId: tokenId });
    }

    await migrateInvitesByHousehold({
      ctx,
      householdId: membership.householdId,
      subjectId,
      tokenId,
    });
  }

  await migrateTableByUserId({ ctx, table: "purchases", subjectId, tokenId });
  await migrateTableByUserId({ ctx, table: "meter_readings", subjectId, tokenId });
}

async function migrateInvitesByHousehold(options: MigrateInvitesOptions): Promise<void> {
  const { ctx, householdId, subjectId, tokenId } = options;

  const invites = await ctx.db
    .query("household_invites")
    .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
    .collect();

  for (const invite of invites) {
    if (invite.createdBy === subjectId) {
      await ctx.db.patch(invite._id, { createdBy: tokenId });
    }
    if (invite.usedBy === subjectId) {
      await ctx.db.patch(invite._id, { usedBy: tokenId });
    }
  }
}

async function migrateTableByUserId(options: MigrateTableOptions): Promise<void> {
  const { ctx, table, subjectId, tokenId } = options;

  const records = await ctx.db
    .query(table)
    .withIndex("by_userId", (q) => q.eq("userId", subjectId))
    .collect();

  for (const record of records) {
    await ctx.db.patch(record._id, { userId: tokenId });
  }
}
