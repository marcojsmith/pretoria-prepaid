import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultiYearChart } from "./MultiYearChart";
import type { MonthlyStat } from "@/hooks/usePurchaseStats";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

vi.mock("@/lib/debounce", () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockStats: MonthlyStat[] = [
  { month: "2025-01", units: 300, cost: 1000, purchases: 3 },
  { month: "2024-12", units: 250, cost: 850, purchases: 2 },
  { month: "2024-11", units: 400, cost: 1400, purchases: 4 },
];

describe("MultiYearChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders chart title", () => {
    render(
      <MultiYearChart
        title="Monthly Usage"
        localStorageKey="test-chart-type"
        monthlyStats={mockStats}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );
    expect(screen.getByText("Monthly Usage")).toBeInTheDocument();
  });

  it("defaults to bar chart", () => {
    render(
      <MultiYearChart
        title="Monthly Usage"
        localStorageKey="test-chart-type"
        monthlyStats={mockStats}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("switches to line chart when line button clicked (handleLineClick)", () => {
    render(
      <MultiYearChart
        title="Monthly Usage"
        localStorageKey="test-chart-type"
        monthlyStats={mockStats}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Line chart" }));
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("switches back to bar chart when bar button clicked (handleBarClick)", () => {
    localStorage.setItem("test-chart-type", "line");
    render(
      <MultiYearChart
        title="Monthly Usage"
        localStorageKey="test-chart-type-2"
        monthlyStats={mockStats}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Line chart" }));
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Bar chart" }));
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("saves chart type preference to localStorage", () => {
    render(
      <MultiYearChart
        title="Monthly Usage"
        localStorageKey="test-save-key"
        monthlyStats={mockStats}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Line chart" }));
    expect(localStorage.getItem("test-save-key")).toBe("line");

    fireEvent.click(screen.getByRole("button", { name: "Bar chart" }));
    expect(localStorage.getItem("test-save-key")).toBe("bar");
  });

  it("loads stored chart type from localStorage", () => {
    localStorage.setItem("stored-chart-key", "line");
    render(
      <MultiYearChart
        title="Monthly Usage"
        localStorageKey="stored-chart-key"
        monthlyStats={mockStats}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("works with daily-average mode", () => {
    render(
      <MultiYearChart
        title="Daily Average"
        localStorageKey="daily-avg-key"
        monthlyStats={mockStats}
        mode="daily-average"
        tooltipUnit="kWh/day"
        tooltipLabel="Avg"
      />
    );
    expect(screen.getByText("Daily Average")).toBeInTheDocument();
  });

  it("renders with empty stats array", () => {
    render(
      <MultiYearChart
        title="Empty Chart"
        localStorageKey="empty-key"
        monthlyStats={[]}
        mode="monthly-total"
        tooltipUnit="kWh"
        tooltipLabel="Usage"
      />
    );
    expect(screen.getByText("Empty Chart")).toBeInTheDocument();
  });
});
