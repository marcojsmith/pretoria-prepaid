import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
    tierBreakdown: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const purchase = {
      userId: identity.subject,
      ...args,
    };

    return await ctx.db.insert("purchases", purchase);
  },
});

export const deletePurchase = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const purchase = await ctx.db.get(args.id);
    if (!purchase || purchase.userId !== identity.subject) {
      throw new Error("Unauthorized or not found");
    }

    await ctx.db.delete(args.id);
  },
});
