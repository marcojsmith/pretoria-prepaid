import { query } from "./_generated/server";
import { QueryCtx } from "./_generated/server";

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

    return await ctx.db.query("purchases").order("desc").take(50);
  },
});
