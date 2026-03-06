import { describe, it, expect, vi } from "vitest";
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

  it("shows stale warning when last reading is older than 7 days", () => {
    // Set 'today' to a fixed date
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));

    const staleStats = {
      lastReading: 100,
      lastReadingDate: "2026-03-01", // 9 days ago
      dailyBurnRate: 10,
      estimatedBalance: 50,
      daysRemaining: 5,
      daysRemainingUntilLow: 4,
      lowBalanceThreshold: 10,
      isEstimatedBurnRate: false,
    };

    render(<ConsumptionStatsCard stats={staleStats} />);
    expect(screen.getByText(/Stale Data/i)).toBeInTheDocument();
    expect(screen.getByText(/9d old/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("does not show stale warning when last reading is recent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));

    const recentStats = {
      lastReading: 100,
      lastReadingDate: "2026-03-08", // 2 days ago
      dailyBurnRate: 10,
      estimatedBalance: 50,
      daysRemaining: 5,
      daysRemainingUntilLow: 4,
      lowBalanceThreshold: 10,
      isEstimatedBurnRate: false,
    };

    render(<ConsumptionStatsCard stats={recentStats} />);
    expect(screen.queryByText(/Stale Data/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows stale warning for future dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));

    const futureStats = {
      lastReading: 100,
      lastReadingDate: "2026-03-15", // 5 days in the future
      dailyBurnRate: 10,
      estimatedBalance: 50,
      daysRemaining: 5,
      daysRemainingUntilLow: 4,
      lowBalanceThreshold: 10,
      isEstimatedBurnRate: false,
    };

    render(<ConsumptionStatsCard stats={futureStats} />);
    expect(screen.getByText(/Stale Data/i)).toBeInTheDocument();

    vi.useRealTimers();
  });
});
