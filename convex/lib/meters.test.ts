/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { resolveMeter, requireHouseholdAdmin, ensurePersonalHouseholdAndMeter } from "./meters";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob(["../**/*.ts", "!../**/*.test.ts"]);

describe("lib/meters", () => {
  describe("resolveMeter", () => {
    it("returns null for a user with no membership and no meterId", async () => {
      const t = convexTest(schema, modules);
      const result = await t.run(async (ctx) => resolveMeter(ctx, "no-such-user"));
      expect(result).toBeNull();
    });

    it("returns the meter when an explicit authorized meterId is given", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-1";

      const meterId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        return await ctx.db.insert("meters", {
          householdId,
          name: "Main",
          createdAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => resolveMeter(ctx, userId, meterId));
      expect(result?._id).toBe(meterId);
    });

    it("throws Unauthorized for an explicit meterId the user has no membership for", async () => {
      const t = convexTest(schema, modules);
      const ownerId = "owner-1";
      const strangerId = "stranger-1";

      const meterId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: ownerId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: ownerId,
          role: "admin",
          joinedAt: Date.now(),
        });
        return await ctx.db.insert("meters", {
          householdId,
          name: "Main",
          createdAt: Date.now(),
        });
      });

      await expect(t.run(async (ctx) => resolveMeter(ctx, strangerId, meterId))).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("throws Unauthorized for an explicit meterId that is archived", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-2";

      const meterId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        return await ctx.db.insert("meters", {
          householdId,
          name: "Main",
          archived: true,
          createdAt: Date.now(),
        });
      });

      await expect(t.run(async (ctx) => resolveMeter(ctx, userId, meterId))).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("throws Unauthorized for a nonexistent meterId", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-3";
      const fakeId = "meters-fake" as unknown as Id<"meters">;

      // Use a real but deleted id to be a valid Convex id.
      const realDeletedId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        const id = await ctx.db.insert("meters", {
          householdId,
          name: "Temp",
          createdAt: Date.now(),
        });
        await ctx.db.delete(id);
        return id;
      });
      void fakeId;

      await expect(t.run(async (ctx) => resolveMeter(ctx, userId, realDeletedId))).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("falls back to profile.activeMeterId when no explicit meterId given", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-4";

      const activeMeterId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        const meterA = await ctx.db.insert("meters", {
          householdId,
          name: "A",
          createdAt: Date.now(),
        });
        const meterB = await ctx.db.insert("meters", {
          householdId,
          name: "B",
          createdAt: Date.now(),
        });
        await ctx.db.insert("profiles", {
          userId,
          email: null,
          activeMeterId: meterB,
        });
        void meterA;
        return meterB;
      });

      const result = await t.run(async (ctx) => resolveMeter(ctx, userId));
      expect(result?._id).toBe(activeMeterId);
    });

    it("falls back to first membership's first non-archived meter when no active meter set", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-5";

      const expectedMeterId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        const archivedMeter = await ctx.db.insert("meters", {
          householdId,
          name: "Old",
          archived: true,
          createdAt: Date.now(),
        });
        const activeMeter = await ctx.db.insert("meters", {
          householdId,
          name: "New",
          createdAt: Date.now(),
        });
        void archivedMeter;
        return activeMeter;
      });

      const result = await t.run(async (ctx) => resolveMeter(ctx, userId));
      expect(result?._id).toBe(expectedMeterId);
    });

    it("returns null when the user has no meters anywhere", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-6";

      await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
      });

      const result = await t.run(async (ctx) => resolveMeter(ctx, userId));
      expect(result).toBeNull();
    });
  });

  describe("requireHouseholdAdmin", () => {
    it("returns membership when caller is admin", async () => {
      const t = convexTest(schema, modules);
      const userId = "admin-1";

      const householdId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId: id,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
        return id;
      });

      const result = await t.run(async (ctx) => requireHouseholdAdmin(ctx, householdId, userId));
      expect(result.role).toBe("admin");
    });

    it("throws 'Not a household admin' when caller has no membership", async () => {
      const t = convexTest(schema, modules);
      const userId = "user-7";

      const householdId = await t.run(async (ctx) => {
        return await ctx.db.insert("households", {
          adminUserId: "someone-else",
          name: "Home",
          createdAt: Date.now(),
        });
      });

      await expect(
        t.run(async (ctx) => requireHouseholdAdmin(ctx, householdId, userId))
      ).rejects.toThrow("Not a household admin");
    });

    it("throws 'Not a household admin' when caller is only a member", async () => {
      const t = convexTest(schema, modules);
      const adminId = "admin-2";
      const memberId = "member-1";

      const householdId = await t.run(async (ctx) => {
        const id = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId: id,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId: id,
          userId: memberId,
          role: "member",
          joinedAt: Date.now(),
        });
        return id;
      });

      await expect(
        t.run(async (ctx) => requireHouseholdAdmin(ctx, householdId, memberId))
      ).rejects.toThrow("Not a household admin");
    });
  });

  describe("ensurePersonalHouseholdAndMeter", () => {
    it("creates a household, meter, and admin membership for a brand new user", async () => {
      const t = convexTest(schema, modules);
      const userId = "fresh-user-1";

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("profiles", {
          userId,
          email: "fresh@test.com",
          meterNumber: "12345",
          lowBalanceThreshold: 20,
          defaultDailyUsage: 5,
        });
      });

      const meterId = await t.run(async (ctx) => {
        const profile = await ctx.db.get(profileId);
        if (!profile) throw new Error("profile missing");
        return await ensurePersonalHouseholdAndMeter(ctx, userId, profile);
      });

      expect(meterId).not.toBeNull();

      const meter = await t.run(async (ctx) => ctx.db.get(meterId as Id<"meters">));
      expect(meter?.name).toBe("Home");
      expect(meter?.meterNumber).toBe("12345");
      expect(meter?.lowBalanceThreshold).toBe(20);
      expect(meter?.defaultDailyUsage).toBe(5);

      const profile = await t.run(async (ctx) => ctx.db.get(profileId));
      expect(profile?.activeMeterId).toBe(meterId);

      const membership = await t.run(async (ctx) =>
        ctx.db
          .query("household_members")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique()
      );
      expect(membership?.role).toBe("admin");
    });

    it("is idempotent when called twice for the same user", async () => {
      const t = convexTest(schema, modules);
      const userId = "fresh-user-2";

      const profileId = await t.run(async (ctx) => {
        return await ctx.db.insert("profiles", { userId, email: null });
      });

      const firstMeterId = await t.run(async (ctx) => {
        const profile = await ctx.db.get(profileId);
        if (!profile) throw new Error("profile missing");
        return await ensurePersonalHouseholdAndMeter(ctx, userId, profile);
      });

      const secondMeterId = await t.run(async (ctx) => {
        const profile = await ctx.db.get(profileId);
        if (!profile) throw new Error("profile missing");
        return await ensurePersonalHouseholdAndMeter(ctx, userId, profile);
      });

      expect(secondMeterId).toBe(firstMeterId);

      const households = await t.run(async (ctx) => ctx.db.query("households").collect());
      expect(households).toHaveLength(1);
      const meters = await t.run(async (ctx) => ctx.db.query("meters").collect());
      expect(meters).toHaveLength(1);
    });

    it("returns null (does not throw) for a non-admin member whose household has no meter", async () => {
      const t = convexTest(schema, modules);
      const adminId = "legacy-admin-1";
      const memberId = "legacy-member-1";

      const memberProfileId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Legacy Home",
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
        return await ctx.db.insert("profiles", { userId: memberId, email: null });
      });

      const result = await t.run(async (ctx) => {
        const profile = await ctx.db.get(memberProfileId);
        if (!profile) throw new Error("profile missing");
        return await ensurePersonalHouseholdAndMeter(ctx, memberId, profile);
      });

      expect(result).toBeNull();
    });

    it("creates the meter for an existing admin household that has no meter yet", async () => {
      const t = convexTest(schema, modules);
      const adminId = "legacy-admin-2";

      const profileId = await t.run(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Legacy Home",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        return await ctx.db.insert("profiles", { userId: adminId, email: null });
      });

      const meterId = await t.run(async (ctx) => {
        const profile = await ctx.db.get(profileId);
        if (!profile) throw new Error("profile missing");
        return await ensurePersonalHouseholdAndMeter(ctx, adminId, profile);
      });

      expect(meterId).not.toBeNull();
      const meters = await t.run(async (ctx) => ctx.db.query("meters").collect());
      expect(meters).toHaveLength(1);
    });
  });
});
