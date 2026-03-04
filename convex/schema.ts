import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  electricity_rates: defineTable({
    tier_number: v.number(),
    tier_label: v.string(),
    min_units: v.number(),
    max_units: v.union(v.number(), v.null()),
    rate: v.number(),
  }),
  profiles: defineTable({
    userId: v.string(), // Clerk's user ID
    email: v.union(v.string(), v.null()),
  }).index("by_userId", ["userId"]),
  purchases: defineTable({
    userId: v.string(),
    date: v.string(),
    units: v.number(),
    cost: v.number(),
    amountPaid: v.number(),
    tierBreakdown: v.any(), // Array of TierBreakdown objects
  }).index("by_userId", ["userId"]),
  user_roles: defineTable({
    userId: v.string(),
    role: v.union(v.literal("admin"), v.string()), // Convex literal or fallback
  }).index("by_userId", ["userId"]),
});
