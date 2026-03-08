import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { YearlyConsumptionChart } from "./YearlyConsumptionChart";
import { usePurchases } from "@/hooks/usePurchase";

// Mock the hook
vi.mock("@/hooks/usePurchase", () => ({
  usePurchases: vi.fn(),
}));

describe("YearlyConsumptionChart", () => {
  const mockMonthlyStats = [
    { month: "2026-03", units: 500, cost: 2000, purchases: 2 },
    { month: "2026-02", units: 450, cost: 1800, purchases: 1 },
    { month: "2026-01", units: 600, cost: 2400, purchases: 3 },
    { month: "2025-12", units: 700, cost: 2800, purchases: 4 },
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
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    expect(screen.getByText("Monthly Consumption (kWh)")).toBeInTheDocument();
    expect(screen.getByText("Last 12 rolling months")).toBeInTheDocument();

    // Check for values (they appear in tooltips, bar value text, and sometimes below bars for desktop)
    // 500: tooltip (500.0), bar value (500), desktop label (500) -> 3 occurrences
    expect(screen.getAllByText(/500/)).toHaveLength(3);
    expect(screen.getAllByText(/450/)).toHaveLength(3);
    expect(screen.getAllByText(/600/)).toHaveLength(3);
    expect(screen.getAllByText(/700/)).toHaveLength(3); // Should be visible as it's within rolling 12 months
  });

  it("shows zero usage for months with no data", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => [{ month: "2026-03", units: 100, cost: 400, purchases: 1 }],
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    // Should show 100 for current month (tooltip, bar value, desktop label)
    expect(screen.getAllByText(/100/)).toHaveLength(3);
    // Should show 0.0 in tooltips for others
    const zeroTooltips = screen.getAllByText(/\b0\.0\b/);
    expect(zeroTooltips.length).toBe(11); // 11 months with zero
  });
});
