/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

describe("users", () => {
  describe("getProfile", () => {
    it("returns null for unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.users.getProfile, {});
      expect(result).toBeNull();
    });

    it("returns profile for authenticated user", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId,
          email: "test@test.com",
          preferredName: "Test User",
        });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.users.getProfile, {});

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(userId);
      expect(result?.preferredName).toBe("Test User");
    });
  });

  describe("getRole", () => {
    it("returns null for unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.users.getRole, {});
      expect(result).toBeNull();
    });

    it("returns 'user' default when no role record exists", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.users.getRole, {});
      expect(result).toBe("user");
    });

    it("returns 'admin' when role record exists", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
        await ctx.db.insert("user_roles", { userId, role: "admin" });
      });

      const result = await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .query(api.users.getRole, {});
      expect(result).toBe("admin");
    });
  });

  describe("syncUser", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(t.mutation(api.users.syncUser, { email: "test@test.com" })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("creates profile + role record on first call", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.syncUser, { email: "test@test.com", preferredName: "New User" });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile).not.toBeNull();
      expect(profile?.email).toBe("test@test.com");
      expect(profile?.preferredName).toBe("New User");

      const role = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("user_roles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(role).not.toBeNull();
      expect(role?.role).toBe("user");
    });

    it("does not overwrite preferredName if already set", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId,
          email: "old@test.com",
          preferredName: "Existing Name",
        });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.syncUser, { email: "new@test.com", preferredName: "New Name" });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.preferredName).toBe("Existing Name");
      expect(profile?.email).toBe("new@test.com");
    });

    it("does not duplicate the role record on second call", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.syncUser, { email: "test@test.com" });
      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.syncUser, { email: "test2@test.com" });

      const roles = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("user_roles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();
      });

      expect(roles).toHaveLength(1);
    });
  });

  describe("updateProfile", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(t.mutation(api.users.updateProfile, { preferredName: "Test" })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("throws 'Profile not found' if profile doesn't exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.users.updateProfile, { preferredName: "Test" })
      ).rejects.toThrow("Profile not found");
    });

    it("updates preferredName when provided", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.updateProfile, { preferredName: "Updated Name" });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.preferredName).toBe("Updated Name");
    });

    it("updates lowBalanceThreshold when provided", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.updateProfile, { lowBalanceThreshold: 50 });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.lowBalanceThreshold).toBe(50);
    });

    it("clears pushSubscription when null is passed", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId,
          email: "test@test.com",
          pushSubscription: {
            endpoint: "https://example.com",
            expirationTime: null,
            keys: { p256dh: "abc", auth: "def" },
          },
        });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.updateProfile, { pushSubscription: null });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.pushSubscription).toBeUndefined();
    });
  });

  describe("updatePushSubscription", () => {
    it("throws 'Not authenticated' if no identity", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.users.updatePushSubscription, { pushNotificationsEnabled: true })
      ).rejects.toThrow("Not authenticated");
    });

    it("throws 'Profile not found' if profile doesn't exist", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await expect(
        t
          .withIdentity({ subject: userId, tokenIdentifier: userId })
          .mutation(api.users.updatePushSubscription, { pushNotificationsEnabled: true })
      ).rejects.toThrow("Profile not found");
    });

    it("sets pushNotificationsEnabled and pushSubscription when subscription provided", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
      });

      const subscription = {
        endpoint: "https://example.com/push",
        expirationTime: null,
        keys: { p256dh: "abc123", auth: "xyz789" },
      };

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.updatePushSubscription, {
          pushNotificationsEnabled: true,
          pushSubscription: subscription,
        });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.pushNotificationsEnabled).toBe(true);
      expect(profile?.pushSubscription).toEqual(subscription);
    });

    it("sets pushNotificationsEnabled to false and leaves subscription unchanged when no subscription arg", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-1";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId,
          email: "test@test.com",
          pushNotificationsEnabled: true,
          pushSubscription: {
            endpoint: "https://example.com/push",
            expirationTime: null,
            keys: { p256dh: "abc123", auth: "xyz789" },
          },
        });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.updatePushSubscription, { pushNotificationsEnabled: false });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.pushNotificationsEnabled).toBe(false);
      expect(profile?.pushSubscription).toBeDefined();
    });
  });

  describe("syncUser - self-healing migration", () => {
    it("migrates profile userId from subject to tokenIdentifier", async () => {
      const t = convexTest(schema, modules);
      const subjectId = "old-sub-123";
      const tokenId = "https://example.com|new-123";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", {
          userId: subjectId,
          email: "test@test.com",
        });
      });

      await t
        .withIdentity({ subject: subjectId, tokenIdentifier: tokenId })
        .mutation(api.users.syncUser, { email: "test@test.com" });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", tokenId))
          .unique();
      });

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(tokenId);
    });

    it("migrates user_roles userId", async () => {
      const t = convexTest(schema, modules);
      const subjectId = "old-sub-456";
      const tokenId = "https://example.com|new-456";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId: subjectId, email: "test@test.com" });
        await ctx.db.insert("user_roles", { userId: subjectId, role: "user" });
      });

      await t
        .withIdentity({ subject: subjectId, tokenIdentifier: tokenId })
        .mutation(api.users.syncUser, { email: "test@test.com" });

      const role = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("user_roles")
          .withIndex("by_userId", (q) => q.eq("userId", tokenId))
          .unique();
      });

      expect(role).not.toBeNull();
      expect(role?.userId).toBe(tokenId);
    });

    it("migrates household_members and adminUserId", async () => {
      const t = convexTest(schema, modules);
      const subjectId = "old-sub-789";
      const tokenId = "https://example.com|new-789";

      const householdId = await t.mutation(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: subjectId,
          name: "Test Household",
          createdAt: Date.now(),
        });
      });

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId: subjectId, email: "test@test.com" });
        await ctx.db.insert("household_members", {
          householdId,
          userId: subjectId,
          role: "admin",
          joinedAt: Date.now(),
        });
      });

      await t
        .withIdentity({ subject: subjectId, tokenIdentifier: tokenId })
        .mutation(api.users.syncUser, { email: "test@test.com" });

      const member = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_members")
          .withIndex("by_userId", (q) => q.eq("userId", tokenId))
          .unique();
      });

      expect(member).not.toBeNull();
      expect(member?.userId).toBe(tokenId);

      const household = await t.mutation(async (ctx) => {
        return await ctx.db.get(householdId);
      });

      expect(household?.adminUserId).toBe(tokenId);
    });

    it("migrates purchases and readings", async () => {
      const t = convexTest(schema, modules);
      const subjectId = "old-sub-abc";
      const tokenId = "https://example.com|new-abc";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId: subjectId, email: "test@test.com" });
        await ctx.db.insert("purchases", {
          userId: subjectId,
          date: "2026-01-15",
          units: 50,
          cost: 500,
          amountPaid: 500,
          tierBreakdown: [],
        });
        await ctx.db.insert("meter_readings", {
          userId: subjectId,
          date: "2026-01-15",
          readingPre: 100,
          readingPost: 150,
          source: "purchase",
        });
      });

      await t
        .withIdentity({ subject: subjectId, tokenIdentifier: tokenId })
        .mutation(api.users.syncUser, { email: "test@test.com" });

      const purchase = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("purchases")
          .withIndex("by_userId", (q) => q.eq("userId", tokenId))
          .unique();
      });

      expect(purchase).not.toBeNull();
      expect(purchase?.userId).toBe(tokenId);

      const reading = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meter_readings")
          .withIndex("by_userId", (q) => q.eq("userId", tokenId))
          .unique();
      });

      expect(reading).not.toBeNull();
      expect(reading?.userId).toBe(tokenId);
    });

    it("no-op when tokenId equals subject", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-same";

      await t.mutation(async (ctx) => {
        await ctx.db.insert("profiles", { userId, email: "test@test.com" });
      });

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.syncUser, { email: "test@test.com" });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile?.userId).toBe(userId);
    });

    it("no-op when no legacy profile exists", async () => {
      const t = convexTest(schema, modules);
      const userId = "test-user-new";

      await t
        .withIdentity({ subject: userId, tokenIdentifier: userId })
        .mutation(api.users.syncUser, { email: "test@test.com" });

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(userId);
    });
  });
});
