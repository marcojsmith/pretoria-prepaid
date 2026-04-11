import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PurchaseFrequencyChart, prepareChartData } from "./PurchaseFrequencyChart";
import { MAX_PURCHASE_FREQUENCY_ITEMS } from "@/lib/constants";

describe("PurchaseFrequencyChart", () => {
  const mockStats = [
    { month: "2026-03", units: 300, cost: 1000, purchases: 3 },
    { month: "2026-02", units: 250, cost: 850, purchases: 2 },
    { month: "2026-01", units: 400, cost: 1400, purchases: 4 },
  ];

  it("returns null when stats are empty", () => {
    const { container } = render(<PurchaseFrequencyChart stats={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with monthly stats", () => {
    render(<PurchaseFrequencyChart stats={mockStats} />);

    expect(screen.getByText(/Refill Frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/Number of purchases per month/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Month:/i)).toBeInTheDocument();
  });

  it("limits display to last 6 months", () => {
    const manyStats = Array.from({ length: 10 }, (_, i) => ({
      month: `2025-${(12 - i).toString().padStart(2, "0")}`,
      units: 100,
      cost: 300,
      purchases: i + 1,
    }));

    const result = prepareChartData(manyStats);
    expect(result).toHaveLength(MAX_PURCHASE_FREQUENCY_ITEMS);
    expect(result.at(-1)?.purchases).toBe(1);
    expect(result.at(0)?.purchases).toBe(6);
  });

  it("shows current month purchase count in footer", () => {
    render(<PurchaseFrequencyChart stats={mockStats} />);
    expect(screen.getByText(/Current Month:/i)).toBeInTheDocument();
    const currentMonthSpan = screen.getByText("3");
    expect(currentMonthSpan).toHaveClass("text-primary");
  });
});
