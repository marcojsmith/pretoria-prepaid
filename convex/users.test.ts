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

  describe("updateProfile meter mirroring", () => {
    async function seedHouseholdWithMeter(t: ReturnType<typeof convexTest>) {
      const adminId = "profile-admin-1";
      const memberId = "profile-member-1";

      const meterId = await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: memberId,
          role: "member",
          joinedAt: Date.now(),
        });
        const meterId = await ctx.db.insert("meters", {
          householdId,
          name: "Home Meter",
          meterNumber: "OLD",
          createdAt: Date.now(),
        });
        await ctx.db.insert("profiles", { userId: adminId, email: null, activeMeterId: meterId });
        await ctx.db.insert("profiles", {
          userId: memberId,
          email: null,
          activeMeterId: meterId,
        });
        return meterId;
      });

      return { adminId, memberId, meterId };
    }

    it("mirrors meterNumber/lowBalanceThreshold/defaultDailyUsage onto the meter when the caller is admin", async () => {
      const t = convexTest(schema, modules);
      const { adminId, meterId } = await seedHouseholdWithMeter(t);

      await t
        .withIdentity({ subject: adminId, tokenIdentifier: adminId })
        .mutation(api.users.updateProfile, {
          meterNumber: "NEW123",
          lowBalanceThreshold: 42,
          defaultDailyUsage: 7,
        });

      const meter = await t.mutation(async (ctx) => ctx.db.get(meterId));
      expect(meter?.meterNumber).toBe("NEW123");
      expect(meter?.lowBalanceThreshold).toBe(42);
      expect(meter?.defaultDailyUsage).toBe(7);

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
      });
      expect(profile?.meterNumber).toBe("NEW123");
      expect(profile?.lowBalanceThreshold).toBe(42);
    });

    it("does not patch the meter when a non-admin member updates their profile", async () => {
      const t = convexTest(schema, modules);
      const { memberId, meterId } = await seedHouseholdWithMeter(t);

      await t
        .withIdentity({ subject: memberId, tokenIdentifier: memberId })
        .mutation(api.users.updateProfile, {
          meterNumber: "MEMBER-EDIT",
          lowBalanceThreshold: 11,
        });

      const meter = await t.mutation(async (ctx) => ctx.db.get(meterId));
      expect(meter?.meterNumber).toBe("OLD");
      expect(meter?.lowBalanceThreshold).toBeUndefined();

      const profile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", memberId))
          .unique();
      });
      expect(profile?.meterNumber).toBe("MEMBER-EDIT");
      expect(profile?.lowBalanceThreshold).toBe(11);
    });
  });
});
