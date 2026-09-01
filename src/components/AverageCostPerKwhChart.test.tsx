import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AverageCostPerKwhChart, prepareChartData } from "./AverageCostPerKwhChart";
import { MAX_COST_PER_KWH_CHART_ITEMS } from "@/lib/constants";

describe("AverageCostPerKwhChart", () => {
  const mockStats = [
    { month: "2026-03", units: 300, cost: 1200, purchases: 3 },
    { month: "2026-02", units: 250, cost: 850, purchases: 2 },
    { month: "2026-01", units: 400, cost: 1400, purchases: 4 },
  ];

  it("returns null when stats are empty", () => {
    const { container } = render(<AverageCostPerKwhChart stats={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with monthly stats", () => {
    render(<AverageCostPerKwhChart stats={mockStats} />);

    expect(screen.getByText(/Average Cost per kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/Your blended rate per unit, per month/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Month:/i)).toBeInTheDocument();
  });

  it("limits display to last 6 months and computes cost / units", () => {
    const manyStats = Array.from({ length: 10 }, (_, i) => ({
      month: `2025-${(12 - i).toString().padStart(2, "0")}`,
      units: 100,
      cost: 300 + i,
      purchases: i + 1,
    }));

    const result = prepareChartData(manyStats);
    expect(result).toHaveLength(MAX_COST_PER_KWH_CHART_ITEMS);
    // manyStats[0] = month 2025-12, cost 300, units 100 -> ratePerKwh 3
    // most recent 6 entries reversed to oldest-first: last entry is the most recent (index 0)
    expect(result.at(-1)?.ratePerKwh).toBe(3);
  });

  it("returns null ratePerKwh for a month with zero units", () => {
    const statsWithZero = [{ month: "2026-01", units: 0, cost: 500, purchases: 1 }];
    const result = prepareChartData(statsWithZero);
    expect(result[0]?.ratePerKwh).toBeNull();
  });

  it("shows current month rate in footer", () => {
    render(<AverageCostPerKwhChart stats={mockStats} />);
    expect(screen.getByText(/Current Month:/i)).toBeInTheDocument();
    expect(screen.getByText("R 4.00/kWh")).toBeInTheDocument();
  });
});
