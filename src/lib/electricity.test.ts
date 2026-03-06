import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateCost,
  getTierLabel,
  getTierBreakdownForUnits,
  formatCurrency,
  roundUnits,
  roundCurrency,
  getCurrentMonth,
  getMonthName,
  getDaysLeftInMonth,
  getTierProgress,
  calculateRefillIntervals,
  Purchase,
  ElectricityRate,
} from "./electricity";

const MOCK_RATES: ElectricityRate[] = [
  { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.42585 },
  { _id: "2", tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.00936 },
  { _id: "3", tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.36816 },
  {
    _id: "4",
    tier_number: 4,
    tier_label: "Tier 4",
    min_units: 651,
    max_units: null,
    rate: 4.70902,
  },
];

describe("electricity calculator utilities", () => {
  describe("calculateCost", () => {
    it("calculates cost for Tier 1 correctly", () => {
      const { total, breakdown } = calculateCost(10, 0, MOCK_RATES);
      expect(total).toBeCloseTo(34.2585, 4);
      expect(breakdown[0].units).toBe(10);
      expect(breakdown[0].tier).toBe(1);
    });

    it("calculates cost across multiple tiers", () => {
      const { total } = calculateCost(150, 0, MOCK_RATES);
      const expected = 100 * 3.42585 + 50 * 4.00936;
      expect(total).toBeCloseTo(expected, 4);
    });

    it("respects unitsAlreadyBought", () => {
      const { breakdown } = calculateCost(10, 100, MOCK_RATES);
      expect(breakdown[0].tier).toBe(2);
      expect(breakdown[0].rate).toBe(4.00936);
    });

    it("handles zero or negative units", () => {
      expect(calculateCost(0, 0, MOCK_RATES).total).toBe(0);
      expect(calculateCost(-10, 0, MOCK_RATES).total).toBe(0);
    });

    it("caps units correctly at highest tier", () => {
      const { breakdown } = calculateCost(1000, 0, MOCK_RATES);
      expect(breakdown.length).toBe(4);
      expect(breakdown[3].label).toBe("Tier 4");
    });
  });

  describe("getTierLabel", () => {
    it("returns correct labels", () => {
      expect(getTierLabel(50, MOCK_RATES)).toBe("Tier 1");
      expect(getTierLabel(150, MOCK_RATES)).toBe("Tier 2");
      expect(getTierLabel(450, MOCK_RATES)).toBe("Tier 3");
      expect(getTierLabel(700, MOCK_RATES)).toBe("Tier 4");
      expect(getTierLabel(0, MOCK_RATES)).toBe("Tier 1");
    });
  });

  describe("getTierBreakdownForUnits", () => {
    it("returns breakdown starting from zero", () => {
      const breakdown = getTierBreakdownForUnits(150, MOCK_RATES);
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
      const progress = getTierProgress(150, MOCK_RATES);
      expect(progress[0].progress).toBe(100); // Tier 1 full
      expect(progress[1].progress).toBeGreaterThan(0); // Tier 2 started
      expect(progress[1].progress).toBeLessThan(100);
      expect(progress[2].progress).toBe(0); // Tier 3 not started
    });
  });

  describe("calculateRefillIntervals", () => {
    it("returns empty array for no purchases", () => {
      expect(calculateRefillIntervals([])).toEqual([]);
    });

    it("calculates intervals correctly", () => {
      const purchases: Purchase[] = [
        { _id: "1", date: "2024-03-01", units: 100, cost: 0, amountPaid: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-03-05", units: 50, cost: 0, amountPaid: 150, tierBreakdown: [] },
        { _id: "3", date: "2024-03-10", units: 80, cost: 0, amountPaid: 240, tierBreakdown: [] },
      ];

      const result = calculateRefillIntervals(purchases);

      expect(result).toHaveLength(3);
      expect(result[0].daysSinceLastRefill).toBeNull();
      expect(result[1].daysSinceLastRefill).toBe(4);
      expect(result[2].daysSinceLastRefill).toBe(5);
    });

    it("handles unsorted purchases", () => {
      const purchases: Purchase[] = [
        { _id: "3", date: "2024-03-10", units: 80, cost: 0, amountPaid: 240, tierBreakdown: [] },
        { _id: "1", date: "2024-03-01", units: 100, cost: 0, amountPaid: 300, tierBreakdown: [] },
        { _id: "2", date: "2024-03-05", units: 50, cost: 0, amountPaid: 150, tierBreakdown: [] },
      ];

      const result = calculateRefillIntervals(purchases);

      expect(result[0].date).toBe("2024-03-01");
      expect(result[1].date).toBe("2024-03-05");
      expect(result[2].date).toBe("2024-03-10");
      expect(result[1].daysSinceLastRefill).toBe(4);
      expect(result[2].daysSinceLastRefill).toBe(5);
    });
  });
});
