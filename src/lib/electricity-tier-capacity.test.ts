import { describe, it, expect } from "vitest";
import { getRemainingTierCapacity, ElectricityRate } from "./electricity";

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

describe("getRemainingTierCapacity", () => {
  it("returns full Tier 1 capacity when 0 units bought", () => {
    const result = getRemainingTierCapacity(0, MOCK_RATES);
    expect(result.units).toBe(100);
    expect(result.label).toBe("Tier 1");
    expect(result.rate).toBe(3.42585);
  });

  it("returns partial Tier 1 capacity", () => {
    const result = getRemainingTierCapacity(50, MOCK_RATES);
    expect(result.units).toBe(50);
    expect(result.label).toBe("Tier 1");
  });

  it("returns Tier 2 capacity when Tier 1 is exhausted", () => {
    const result = getRemainingTierCapacity(100, MOCK_RATES);
    expect(result.units).toBe(300);
    expect(result.label).toBe("Tier 2");
    expect(result.rate).toBe(4.00936);
  });

  it("returns partial Tier 2 capacity", () => {
    const result = getRemainingTierCapacity(150, MOCK_RATES);
    expect(result.units).toBe(250);
    expect(result.label).toBe("Tier 2");
  });

  it("returns Infinity for the last tier with no max", () => {
    const result = getRemainingTierCapacity(700, MOCK_RATES);
    expect(result.units).toBe(Infinity);
    expect(result.label).toBe("Tier 4");
  });

  it("handles empty rates gracefully", () => {
    const result = getRemainingTierCapacity(0, []);
    expect(result.units).toBe(0);
    expect(result.label).toBe("Unknown");
  });

  it("returns 0 when all tiers are finite and exhausted", () => {
    const finiteRates: ElectricityRate[] = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.5 },
    ];
    const result = getRemainingTierCapacity(150, finiteRates);
    expect(result.units).toBe(0);
    expect(result.label).toBe("Tier 1");
  });
});
