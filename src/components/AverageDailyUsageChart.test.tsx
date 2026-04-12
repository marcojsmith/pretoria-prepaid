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
    localStorage.clear();
  });

  it("renders correctly with rolling 12 months", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as unknown as ReturnType<typeof usePurchases>);

    render(<AverageDailyUsageChart />);

    expect(screen.getByText("Average Daily Consumption (kWh/d)")).toBeInTheDocument();
    expect(screen.getByText(/\d+ years? — Jan to Dec/i)).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("handles zero data correctly", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => [],
    } as unknown as ReturnType<typeof usePurchases>);

    render(<AverageDailyUsageChart />);

    expect(screen.getByText("Average Daily Consumption (kWh/d)")).toBeInTheDocument();
    expect(screen.getByText("Last 1 year — Jan to Dec")).toBeInTheDocument();
  });

  it("persists chart type selection to localStorage", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as unknown as ReturnType<typeof usePurchases>);

    render(<AverageDailyUsageChart />);

    const lineBtn = screen.getByRole("button", { name: /line chart/i });
    lineBtn.click();
    vi.runAllTimers();

    expect(localStorage.getItem("avg_daily_chart_type")).toBe("line");
  });

  it("restores chart type from localStorage on mount", () => {
    localStorage.setItem("avg_daily_chart_type", "line");

    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as unknown as ReturnType<typeof usePurchases>);

    render(<AverageDailyUsageChart />);

    const lineBtn = screen.getByRole("button", { name: /line chart/i });
    expect(lineBtn).toBeInTheDocument();
    const barBtn = screen.getByRole("button", { name: /bar chart/i });
    expect(barBtn).toBeInTheDocument();
    expect(screen.getByText("All years — Jan to Dec")).toBeInTheDocument();
  });
});
