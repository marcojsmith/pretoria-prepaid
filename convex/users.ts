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
      await ctx.db.insert("profiles", {
        userId: identity.subject,
        email: args.email,
      });
    } else if (existingProfile.email !== args.email) {
      await ctx.db.patch(existingProfile._id, { email: args.email });
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
