import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateCost,
  getHighestApplicableTierRate,
  getTierLabel,
  calculateCostAtHighestTier,
  getTierBreakdownForUnits,
  formatCurrency,
  roundUnits,
  roundCurrency,
  getCurrentMonth,
  getMonthName,
  getDaysLeftInMonth,
  getTierProgress,
} from "./electricity";

describe("electricity calculator utilities", () => {
  describe("calculateCost", () => {
    it("calculates cost for Tier 1 correctly", () => {
      const { total, breakdown } = calculateCost(10);
      expect(total).toBeCloseTo(34.2585, 4);
      expect(breakdown[0].units).toBe(10);
      expect(breakdown[0].tier).toBe(1);
    });

    it("calculates cost across multiple tiers", () => {
      const { total } = calculateCost(150);
      const expected = 100 * 3.42585 + 50 * 4.00936;
      expect(total).toBeCloseTo(expected, 4);
    });

    it("respects unitsAlreadyBought", () => {
      const { breakdown } = calculateCost(10, 100);
      expect(breakdown[0].tier).toBe(2);
      expect(breakdown[0].rate).toBe(4.00936);
    });

    it("handles zero or negative units", () => {
      expect(calculateCost(0).total).toBe(0);
      expect(calculateCost(-10).total).toBe(0);
    });

    it("caps units correctly at highest tier", () => {
      const { breakdown } = calculateCost(1000, 0);
      expect(breakdown.length).toBe(4);
      expect(breakdown[3].label).toBe("Tier 4");
    });
  });

  describe("getHighestApplicableTierRate", () => {
    it("returns Tier 1 rate for low units", () => {
      expect(getHighestApplicableTierRate(50)).toBe(3.42585);
    });
    it("returns Tier 4 rate for high units", () => {
      expect(getHighestApplicableTierRate(700)).toBe(4.70902);
    });
    it("returns Tier 1 rate for 0 or negative", () => {
      expect(getHighestApplicableTierRate(0)).toBe(3.42585);
      expect(getHighestApplicableTierRate(-10)).toBe(3.42585);
    });
  });

  describe("getTierLabel", () => {
    it("returns correct labels", () => {
      expect(getTierLabel(50)).toBe("Tier 1");
      expect(getTierLabel(150)).toBe("Tier 2");
      expect(getTierLabel(450)).toBe("Tier 3");
      expect(getTierLabel(700)).toBe("Tier 4");
      expect(getTierLabel(0)).toBe("Tier 1");
    });
  });

  describe("calculateCostAtHighestTier", () => {
    it("calculates total cost at highest tier rate", () => {
      expect(calculateCostAtHighestTier(100)).toBe(100 * 3.42585);
      expect(calculateCostAtHighestTier(700)).toBe(700 * 4.70902);
    });
  });

  describe("getTierBreakdownForUnits", () => {
    it("returns breakdown starting from zero", () => {
      const breakdown = getTierBreakdownForUnits(150);
      expect(breakdown.length).toBe(2);
      expect(breakdown[0].tier).toBe(1);
      expect(breakdown[1].tier).toBe(2);
    });
  });

  describe("Formatting and Rounding", () => {
    it("formatCurrency formats correctly", () => {
      expect(formatCurrency(123.456)).toBe("R 123.46");
      expect(formatCurrency(10)).toBe("R 10.00");
    });

    it("roundUnits rounds to 1 decimal place", () => {
      expect(roundUnits(10.123)).toBe(10.1);
      expect(roundUnits(10.15)).toBe(10.2);
    });

    it("roundCurrency rounds to 2 decimal places", () => {
      expect(roundCurrency(10.123)).toBe(10.12);
      expect(roundCurrency(10.125)).toBe(10.13);
    });
  });

  describe("Date utilities", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15)); // Jan 15, 2024
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("getCurrentMonth returns YYYY-MM", () => {
      expect(getCurrentMonth()).toBe("2024-01");
    });

    it("getMonthName formats correctly", () => {
      expect(getMonthName("2024-01")).toBe("January 2024");
    });

    it("getDaysLeftInMonth calculates correctly", () => {
      // 2024 is a leap year, Jan has 31 days. 31 - 15 = 16
      expect(getDaysLeftInMonth()).toBe(16);
    });
  });

  describe("getTierProgress", () => {
    it("calculates progress for each tier correctly", () => {
      const progress = getTierProgress(150);
      expect(progress[0].progress).toBe(100); // Tier 1 full
      expect(progress[1].progress).toBeGreaterThan(0); // Tier 2 started
      expect(progress[1].progress).toBeLessThan(100);
      expect(progress[2].progress).toBe(0); // Tier 3 not started
    });
  });
});
