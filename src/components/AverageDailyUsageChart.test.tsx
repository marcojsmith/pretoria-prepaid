import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AverageDailyUsageChart } from "./AverageDailyUsageChart";
import { usePurchases } from "@/hooks/usePurchase";

// Mock the hook
vi.mock("@/hooks/usePurchase", () => ({
  usePurchases: vi.fn(),
}));

describe("AverageDailyUsageChart", () => {
  const mockMonthlyStats = [
    { month: "2026-03", units: 310, cost: 1000, purchases: 2 }, // 10 kWh/day
    { month: "2026-02", units: 280, cost: 900, purchases: 1 }, // 10 kWh/day
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders correctly with rolling 12 months", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as any);

    render(<AverageDailyUsageChart />);

    expect(screen.getByText("Average Daily Consumption (kWh/d)")).toBeInTheDocument();

    // 10.0 kWh/d should appear for Mar and Feb
    // Each appears 3 times: tooltip, bar value, and desktop label
    expect(screen.getAllByText(/10\.0/)).toHaveLength(6);
  });

  it("handles zero data correctly", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => [],
    } as any);

    render(<AverageDailyUsageChart />);

    // All bars should show 0 or be empty
    expect(screen.queryByText(/[1-9]\./)).not.toBeInTheDocument();
  });
});
