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
    (convexReact.useQuery as any).mockReturnValue(MOCK_RATES);
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
});
