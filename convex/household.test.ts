/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "../_generated/**/*.ts", "!./**/*.test.ts"]);

describe("household", () => {
  describe("getMyHousehold", () => {
    it("returns null when unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.household.getMyHousehold, {});
      expect(result).toBeNull();
    });

    it("returns null when user has no membership", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .query(api.household.getMyHousehold, {});
      const result = await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .query(api.household.getMyHousehold, {});
      expect(result).toBeNull();
    });

    it("returns household data for a member", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
      });

      const result = await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .query(api.household.getMyHousehold, {});

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Household");
      expect(result?.myRole).toBe("admin");
      expect(result?.members).toHaveLength(1);
    });
  });

  describe("createHousehold", () => {
    it("throws 'Not authenticated' when unauthenticated", async () => {
      const t = convexTest(schema, modules);

      await expect(t.mutation(api.household.createHousehold, { name: "Test" })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("creates household and inserts admin member record", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .mutation(api.household.createHousehold, { name: "My Household" });

      const household = await t.mutation(async (ctx) => {
        return await ctx.db.query("households").unique();
      });

      expect(household).not.toBeNull();
      expect(household?.name).toBe("My Household");
      expect(household?.adminUserId).toBe(userId);

      const member = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_members")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe("admin");
    });

    it("throws 'Already in a household' if user already has a membership", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Existing Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.createHousehold, { name: "New Household" })
      ).rejects.toThrow("Already in a household");
    });

    it("throws 'Household name cannot be empty' for blank name", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.createHousehold, { name: "   " })
      ).rejects.toThrow("Household name cannot be empty");
    });
  });

  describe("joinHousehold", () => {
    it("throws 'Invalid invite code' for unknown code", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.joinHousehold, { code: "INVALID" })
      ).rejects.toThrow("Invalid invite code");
    });

    it("throws 'Invite has been revoked' for revoked invite", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";
      const code = "TESTCODE";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code,
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
          revoked: true,
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.joinHousehold, { code })
      ).rejects.toThrow("Invite has been revoked");
    });

    it("throws 'Invite has already been used' for used invite", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";
      const code = "TESTCODE";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code,
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
          usedBy: "someone",
          usedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.joinHousehold, { code })
      ).rejects.toThrow("Invite has already been used");
    });

    it("throws 'Invite has expired' for expired invite", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";
      const code = "TESTCODE";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code,
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() - 1,
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.joinHousehold, { code })
      ).rejects.toThrow("Invite has expired");
    });

    it("joins successfully and patches invite usedBy + inserts member record", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";
      const code = "TESTCODE";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code,
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
        });
      });

      const result = await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .mutation(api.household.joinHousehold, { code });

      expect(result).toBeDefined();

      const invite = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_invites")
          .withIndex("by_code", (q) => q.eq("code", code))
          .unique();
      });

      expect(invite?.usedBy).toBe(userId);
      expect(invite?.usedAt).toBeDefined();

      const member = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_members")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe("member");
    });

    it("throws 'Already in a household' if already a member", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";
      const code = "TESTCODE";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code,
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.joinHousehold, { code })
      ).rejects.toThrow("Already in a household");
    });
  });

  describe("leaveHousehold", () => {
    it("throws 'Not in a household' if no membership", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.leaveHousehold, {})
      ).rejects.toThrow("Not in a household");
    });

    it("throws 'Admin cannot leave. Disband the household instead.' if admin tries to leave", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.leaveHousehold, {})
      ).rejects.toThrow("Admin cannot leave. Disband the household instead.");
    });

    it("deletes membership for a regular member", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .mutation(api.household.leaveHousehold, {});

      const member = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_members")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(member).toBeNull();
    });
  });

  describe("disbandHousehold", () => {
    it("throws 'Not admin' if non-admin calls it", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.disbandHousehold, {})
      ).rejects.toThrow("Not admin");
    });

    it("removes non-admin members and invites, but keeps the household document", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      let householdId: Id<"households"> | null = null;

      await t.mutation(async (ctx) => {
        householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code: "TESTCODE",
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
        });
      });

      await t
        .withIdentity({ subject: "admin", tokenIdentifier: adminId })
        .mutation(api.household.disbandHousehold, {});

      const household = await t.mutation(async (ctx) => {
        return await ctx.db.get(householdId!);
      });
      expect(household).not.toBeNull();

      const members = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_members")
          .withIndex("by_householdId", (q) => q.eq("householdId", householdId!))
          .collect();
      });
      expect(members).toHaveLength(1);
      expect(members[0]?.userId).toBe(adminId);

      const invites = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_invites")
          .withIndex("by_householdId", (q) => q.eq("householdId", householdId!))
          .collect();
      });
      expect(invites).toHaveLength(0);
    });

    it("keeps household meters assigned to the admin and clears activeMeterId only for removed members", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      let householdId: Id<"households"> | null = null;
      let adminMeterId: Id<"meters"> | null = null;
      let memberMeterId: Id<"meters"> | null = null;

      await t.mutation(async (ctx) => {
        householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });

        adminMeterId = await ctx.db.insert("meters", {
          householdId,
          name: "Admin Meter",
          createdAt: Date.now(),
        });
        memberMeterId = await ctx.db.insert("meters", {
          householdId,
          name: "Member Meter",
          createdAt: Date.now(),
        });

        await ctx.db.insert("profiles", {
          userId: adminId,
          email: "admin@test.com",
          activeMeterId: adminMeterId,
        });
        await ctx.db.insert("profiles", {
          userId,
          email: "user1@test.com",
          activeMeterId: memberMeterId,
        });
      });

      await t
        .withIdentity({ subject: "admin", tokenIdentifier: adminId })
        .mutation(api.household.disbandHousehold, {});

      const meters = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("meters")
          .withIndex("by_householdId", (q) => q.eq("householdId", householdId!))
          .collect();
      });
      expect(meters).toHaveLength(2);

      const adminMeter = await t.mutation(async (ctx) => ctx.db.get(adminMeterId!));
      const memberMeter = await t.mutation(async (ctx) => ctx.db.get(memberMeterId!));
      expect(adminMeter).not.toBeNull();
      expect(memberMeter).not.toBeNull();

      const adminProfile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", adminId))
          .unique();
      });
      const memberProfile = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(adminProfile?.activeMeterId).toBe(adminMeterId);
      expect(memberProfile?.activeMeterId).toBeUndefined();
    });
  });

  describe("removeMember", () => {
    it("throws 'Cannot remove yourself' when userId matches caller's tokenIdentifier", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: userId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId,
          role: "admin",
          joinedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.removeMember, { userId })
      ).rejects.toThrow("Cannot remove yourself");
    });

    it("throws 'Not admin' if caller is not admin", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "user1", tokenIdentifier: userId })
          .mutation(api.household.removeMember, { userId: adminId })
      ).rejects.toThrow("Not admin");
    });

    it("throws 'User not in your household' if target not in same household", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";
      const otherUserId = "https://example.com|other";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      await expect(
        t
          .withIdentity({ subject: "admin", tokenIdentifier: adminId })
          .mutation(api.household.removeMember, { userId: otherUserId })
      ).rejects.toThrow("User not in your household");
    });

    it("deletes target membership on success", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      await t
        .withIdentity({ subject: "admin", tokenIdentifier: adminId })
        .mutation(api.household.removeMember, { userId });

      const member = await t.mutation(async (ctx) => {
        return await ctx.db
          .query("household_members")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(member).toBeNull();
    });
  });

  describe("getMyInvites", () => {
    it("returns empty array if unauthenticated", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(api.household.getMyInvites, {});
      expect(result).toEqual([]);
    });

    it("returns empty array if caller is not admin", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";
      const userId = "https://example.com|user1";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
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
          userId,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      const result = await t
        .withIdentity({ subject: "user1", tokenIdentifier: userId })
        .query(api.household.getMyInvites, {});

      expect(result).toEqual([]);
    });

    it("returns invites for admin's household", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|admin";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Test Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code: "CODE1",
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code: "CODE2",
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
        });
      });

      const result = await t
        .withIdentity({ subject: "admin", tokenIdentifier: adminId })
        .query(api.household.getMyInvites, {});

      expect(result).toHaveLength(2);
    });
  });

  describe("phase-2 known regression: syncUser auto-provisioning vs. join/create guards", () => {
    it("createHousehold still throws 'Already in a household' for a user auto-provisioned by syncUser", async () => {
      const t = convexTest(schema, modules);
      const userId = "https://example.com|autoprovisioned1";
      const asUser = t.withIdentity({ subject: "autoprovisioned1", tokenIdentifier: userId });

      // syncUser auto-provisions a personal household + meter (see convex/users.ts).
      await asUser.mutation(api.users.syncUser, { email: "auto1@test.com" });

      await expect(asUser.mutation(api.household.createHousehold, { name: "New" })).rejects.toThrow(
        "Already in a household"
      );
    });

    it("joinHousehold still throws 'Already in a household' for a user auto-provisioned by syncUser", async () => {
      const t = convexTest(schema, modules);
      const adminId = "https://example.com|inviteadmin1";
      const userId = "https://example.com|autoprovisioned2";
      const code = "JOINCODE";

      await t.mutation(async (ctx) => {
        const householdId = await ctx.db.insert("households", {
          adminUserId: adminId,
          name: "Other Household",
          createdAt: Date.now(),
        });
        await ctx.db.insert("household_members", {
          householdId,
          userId: adminId,
          role: "admin",
          joinedAt: Date.now(),
        });
        await ctx.db.insert("household_invites", {
          householdId,
          code,
          createdBy: adminId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1_000_000,
        });
      });

      const asUser = t.withIdentity({ subject: "autoprovisioned2", tokenIdentifier: userId });
      await asUser.mutation(api.users.syncUser, { email: "auto2@test.com" });

      await expect(asUser.mutation(api.household.joinHousehold, { code })).rejects.toThrow(
        "Already in a household"
      );
    });
  });
});
