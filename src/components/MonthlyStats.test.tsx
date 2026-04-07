import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyStats } from "./MonthlyStats";
import * as convexReact from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

const MOCK_RATES = [
  { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.42585 },
  { _id: "2", tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.00936 },
  { _id: "3", tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.36816 },
  {
    _id: "4",
    tier_number: 4,
    tier_label: "Tier 4",
    min_units: 651,
    max_units: null,
    rate: 4.70902,
  },
];

describe("MonthlyStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useQuery).mockReturnValue(MOCK_RATES);
  });

  it("renders empty message when no stats provided", () => {
    render(<MonthlyStats stats={[]} averageUsage={0} />);
    expect(screen.getByText(/No monthly data available yet/i)).toBeInTheDocument();
  });

  it("renders stats when provided", () => {
    const stats = [
      { month: "2024-01", units: 100, cost: 342, purchases: 1 },
      { month: "2024-02", units: 200, cost: 742, purchases: 2 },
    ];
    render(<MonthlyStats stats={stats} averageUsage={150} />);
    expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/February 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/100 kWh/)).toBeInTheDocument();
  });

  it("displays average usage when provided", () => {
    const stats = [{ month: "2024-01", units: 100, cost: 342, purchases: 1 }];
    render(<MonthlyStats stats={stats} averageUsage={150} />);
    // Average usage is shown as ↓ arrow when below average (100 < 150)
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it("renders multiple months with varying data", () => {
    const stats = [
      { month: "2024-01", units: 50, cost: 171, purchases: 1 },
      { month: "2024-02", units: 150, cost: 514, purchases: 2 },
      { month: "2024-03", units: 200, cost: 742, purchases: 3 },
    ];
    render(<MonthlyStats stats={stats} averageUsage={133} />);
    expect(screen.getByText(/January 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/February 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/March 2024/i)).toBeInTheDocument();
  });

  it("renders loading spinner when rates are loading", () => {
    localStorage.clear(); // ensure no cached rates so loading=true
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
    const stats = [{ month: "2024-01", units: 100, cost: 342, purchases: 1 }];
    const { container } = render(<MonthlyStats stats={stats} averageUsage={100} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows (current) label for the current month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));

    const stats = [
      { month: "2026-04", units: 120, cost: 500, purchases: 2 },
      { month: "2026-03", units: 100, cost: 400, purchases: 1 },
    ];
    render(<MonthlyStats stats={stats} averageUsage={110} />);
    expect(screen.getByText("(current)")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
