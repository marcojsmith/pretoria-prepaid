import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyStats } from "./MonthlyStats";

describe("MonthlyStats", () => {
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
