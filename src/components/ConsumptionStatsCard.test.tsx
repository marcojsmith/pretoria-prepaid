import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConsumptionStatsCard } from "./ConsumptionStatsCard";

describe("ConsumptionStatsCard", () => {
  it("returns null when stats are null", () => {
    const { container } = render(
      <ConsumptionStatsCard stats={null} unitsThisMonth={0} costThisMonth={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders stats correctly", () => {
    const mockStats = {
      lastReading: 100,
      lastReadingDate: "2024-03-01",
      dailyBurnRate: 5.5,
      estimatedBalance: 80.2,
      daysRemaining: 14.58,
      daysRemainingUntilLow: 14.58,
      lowBalanceThreshold: 10,
      isEstimatedBurnRate: false,
    };

    render(<ConsumptionStatsCard stats={mockStats} unitsThisMonth={100} costThisMonth={342} />);

    expect(screen.getByText(/80.2/)).toBeInTheDocument();
    expect(screen.getByText(/5.5/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getAllByText(/Days/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Based on estimate/i)).not.toBeInTheDocument();
  });

  it("shows estimate label when burn rate is estimated", () => {
    const mockStats = {
      lastReading: 100,
      lastReadingDate: "2024-03-01",
      dailyBurnRate: 10,
      estimatedBalance: 50,
      daysRemaining: 5,
      daysRemainingUntilLow: 4,
      lowBalanceThreshold: 10,
      isEstimatedBurnRate: true,
    };

    render(<ConsumptionStatsCard stats={mockStats} unitsThisMonth={0} costThisMonth={0} />);
    expect(screen.getByText(/Based on estimate/i)).toBeInTheDocument();
  });

  it("applies destructive color classes when balance is low", () => {
    const lowStats = {
      lastReading: 100,
      lastReadingDate: "2026-04-01",
      dailyBurnRate: 5,
      estimatedBalance: 30,
      daysRemaining: 6,
      daysRemainingUntilLow: 0,
      lowBalanceThreshold: 50,
      isEstimatedBurnRate: false,
    };

    render(<ConsumptionStatsCard stats={lowStats} unitsThisMonth={0} costThisMonth={0} />);

    // The balance paragraph shows "30 kWh" and should have text-destructive class
    const balanceElements = document.querySelectorAll(".text-destructive");
    expect(balanceElements.length).toBeGreaterThan(0);

    // Also verify the balance value is visible
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });
});
