import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConsumptionStatsCard } from "./ConsumptionStatsCard";

describe("ConsumptionStatsCard", () => {
  it("returns null when stats are null", () => {
    const { container } = render(<ConsumptionStatsCard stats={null} />);
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

    render(<ConsumptionStatsCard stats={mockStats} />);

    expect(screen.getByText(/80.2 kWh/i)).toBeInTheDocument();
    expect(screen.getByText(/5.5 kWh\/d/i)).toBeInTheDocument();
    expect(screen.getByText(/15 Days/i)).toBeInTheDocument();
    expect(screen.queryByText(/Estimate/i)).not.toBeInTheDocument();
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

    render(<ConsumptionStatsCard stats={mockStats} />);
    expect(screen.getByText(/Estimate/i)).toBeInTheDocument();
  });
});
