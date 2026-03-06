import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PurchaseFrequencyChart } from "./PurchaseFrequencyChart";

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

    // Check if months are rendered (South African locale)
    expect(screen.getByText(/Mar/i)).toBeInTheDocument();
    expect(screen.getByText(/Feb/i)).toBeInTheDocument();
    expect(screen.getByText(/Jan/i)).toBeInTheDocument();

    // Check for purchase numbers
    expect(screen.getAllByText("3")[0]).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("limits display to last 6 months", () => {
    const manyStats = Array.from({ length: 10 }, (_, i) => ({
      month: `2025-${(12 - i).toString().padStart(2, "0")}`,
      units: 100,
      cost: 300,
      purchases: 1,
    }));

    const { container } = render(<PurchaseFrequencyChart stats={manyStats} />);
    const bars = container.querySelectorAll(".group.relative.flex.h-full");
    expect(bars.length).toBe(6);
  });

  it("shows current month purchase count in footer", () => {
    render(<PurchaseFrequencyChart stats={mockStats} />);
    expect(screen.getByText(/Current Month:/i)).toBeInTheDocument();
    // The second occurrence of "3" is in the footer
    const currentMonthSpan = screen.getAllByText("3")[1];
    expect(currentMonthSpan).toHaveClass("text-primary");
  });
});
