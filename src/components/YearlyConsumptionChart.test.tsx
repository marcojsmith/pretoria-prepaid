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
    localStorage.clear();
  });

  it("renders correctly with rolling 12 months", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    expect(screen.getByText("Monthly Consumption (kWh)")).toBeInTheDocument();
    expect(screen.getByText(/\d+ years? — Jan to Dec/i)).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("shows zero usage for months with no data", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => [{ month: "2026-03", units: 100, cost: 400, purchases: 1 }],
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    expect(screen.getByText("Monthly Consumption (kWh)")).toBeInTheDocument();
    expect(screen.getByText("Last 1 year — Jan to Dec")).toBeInTheDocument();
  });

  it("persists chart type selection to localStorage", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    const lineBtn = screen.getByRole("button", { name: /line chart/i });
    lineBtn.click();

    expect(localStorage.getItem("yearly_consumption_chart_type")).toBe("line");
  });

  it("restores chart type from localStorage on mount", () => {
    localStorage.setItem("yearly_consumption_chart_type", "line");

    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    expect(screen.getByText("All years — Jan to Dec")).toBeInTheDocument();
  });
});
