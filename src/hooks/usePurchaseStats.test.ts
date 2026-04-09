import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePurchaseStats, calculateMonthlyStats } from "./usePurchaseStats";
import type { Purchase } from "@/lib/electricity";

describe("usePurchaseStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("calculateMonthlyStats", () => {
    it("groups purchases by month and sorts descending", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-01-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-01-20", units: 200, amountPaid: 600, cost: 600, tierBreakdown: [] },
        { _id: "3", date: "2024-02-10", units: 150, amountPaid: 450, cost: 450, tierBreakdown: [] },
      ];

      const stats = calculateMonthlyStats(purchases);

      expect(stats).toHaveLength(2);
      expect(stats[0]!.month).toBe("2024-02");
      expect(stats[0]!.units).toBe(150);
      expect(stats[0]!.cost).toBe(450);
      expect(stats[0]!.purchases).toBe(1);
      expect(stats[1]!.month).toBe("2024-01");
      expect(stats[1]!.units).toBe(300);
      expect(stats[1]!.cost).toBe(900);
      expect(stats[1]!.purchases).toBe(2);
    });

    it("returns empty array for empty purchases", () => {
      const stats = calculateMonthlyStats([]);
      expect(stats).toHaveLength(0);
    });
  });

  describe("getMonthlyStats", () => {
    it("returns correct monthly data", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-01-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-02-10", units: 150, amountPaid: 450, cost: 450, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));
      const stats = result.current.getMonthlyStats();

      expect(stats).toHaveLength(2);
      expect(stats[0]!.month).toBe("2024-02");
      expect(stats[1]!.month).toBe("2024-01");
    });
  });

  describe("getAverageMonthlyUsage", () => {
    it("returns correct average from previous months", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-01-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-01-20", units: 200, amountPaid: 600, cost: 600, tierBreakdown: [] },
        { _id: "3", date: "2024-02-10", units: 150, amountPaid: 450, cost: 450, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));

      expect(result.current.getAverageMonthlyUsage()).toBe(300);
    });

    it("returns 0 when no previous months exist", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-02-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));

      expect(result.current.getAverageMonthlyUsage()).toBe(0);
    });
  });

  describe("getDailyAverageUsage", () => {
    it("returns correct per-day average", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-01-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-01-20", units: 200, amountPaid: 600, cost: 600, tierBreakdown: [] },
        { _id: "3", date: "2024-02-10", units: 150, amountPaid: 450, cost: 450, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));

      expect(result.current.getDailyAverageUsage()).toBeCloseTo(9.68, 2);
    });

    it("returns 0 when no previous months exist", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-02-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));

      expect(result.current.getDailyAverageUsage()).toBe(0);
    });
  });

  describe("getAverageMonthlyCost", () => {
    it("returns correct average cost", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-01-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-01-20", units: 200, amountPaid: 600, cost: 600, tierBreakdown: [] },
        { _id: "3", date: "2024-02-10", units: 150, amountPaid: 450, cost: 450, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));

      expect(result.current.getAverageMonthlyCost()).toBe(900);
    });

    it("returns 0 when no previous months exist", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-02-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
      ];

      const { result } = renderHook(() => usePurchaseStats(purchases));

      expect(result.current.getAverageMonthlyCost()).toBe(0);
    });
  });
});
