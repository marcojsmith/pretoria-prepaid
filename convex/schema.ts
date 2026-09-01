import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  electricity_rates: defineTable({
    tier_number: v.number(),
    tier_label: v.string(),
    min_units: v.number(),
    max_units: v.union(v.number(), v.null()),
    rate: v.number(),
    // ISO "YYYY-MM-DD" date this rate row takes effect; missing = always-active baseline
    effectiveFrom: v.optional(v.string()),
  }),
  profiles: defineTable({
    userId: v.string(), // Clerk's user ID
    email: v.union(v.string(), v.null()),
    meterNumber: v.optional(v.string()),
    lowBalanceThreshold: v.optional(v.number()),
    defaultDailyUsage: v.optional(v.number()),
    preferredName: v.optional(v.string()),
    pushNotificationsEnabled: v.optional(v.boolean()),
    lastAlertSent: v.optional(v.number()), // Timestamp of last alert
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
    dashboardLayout: v.optional(v.array(v.object({ id: v.string(), visible: v.boolean() }))),
  }).index("by_userId", ["userId"]),
  purchases: defineTable({
    userId: v.string(),
    date: v.string(),
    units: v.number(),
    cost: v.number(),
    amountPaid: v.number(),
    tierBreakdown: v.array(
      v.object({
        tier: v.number(),
        label: v.string(),
        units: v.number(),
        rate: v.number(),
        cost: v.number(),
      })
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"]),
  meter_readings: defineTable({
    userId: v.string(),
    date: v.string(),
    readingPre: v.number(),
    readingPost: v.number(),
    source: v.union(v.literal("purchase"), v.literal("onboarding"), v.literal("orphaned")),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_source", ["userId", "source"]),
  user_roles: defineTable({
    userId: v.string(),
    role: v.union(v.literal("admin"), v.string()),
  }).index("by_userId", ["userId"]),
  rate_limits: defineTable({
    userId: v.string(),
    action: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_userId_action", ["userId", "action"]),
  households: defineTable({
    adminUserId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_adminUserId", ["adminUserId"]),
  household_members: defineTable({
    householdId: v.id("households"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_householdId", ["householdId"]),
  household_invites: defineTable({
    householdId: v.id("households"),
    code: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedBy: v.optional(v.string()),
    usedAt: v.optional(v.number()),
    revoked: v.optional(v.boolean()),
  })
    .index("by_code", ["code"])
    .index("by_householdId", ["householdId"]),
});
