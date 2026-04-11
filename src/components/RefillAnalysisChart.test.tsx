import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RefillAnalysisChart } from "./RefillAnalysisChart";
import type { RefillInterval } from "@/lib/electricity";

describe("RefillAnalysisChart", () => {
  it("returns null when no valid display data exists", () => {
    const intervals: RefillInterval[] = [
      { date: "2024-03-01", daysSinceLastRefill: null, units: 100 },
    ];
    const { container } = render(<RefillAnalysisChart intervals={intervals} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with display data", () => {
    const intervals: RefillInterval[] = [
      { date: "2024-03-01", daysSinceLastRefill: null, units: 100 },
      { date: "2024-03-05", daysSinceLastRefill: 4, units: 50 },
      { date: "2024-03-10", daysSinceLastRefill: 5, units: 80 },
    ];

    render(<RefillAnalysisChart intervals={intervals} />);
    expect(screen.getByText(/Refill Frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/Average: 5 days/i)).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("limits display to last 7 intervals", () => {
    const intervals: RefillInterval[] = [
      { date: "2024-01-01", daysSinceLastRefill: null, units: 10 },
      { date: "2024-01-02", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-03", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-04", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-05", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-06", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-07", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-08", daysSinceLastRefill: 1, units: 10 },
      { date: "2024-01-09", daysSinceLastRefill: 1, units: 10 },
    ];

    render(<RefillAnalysisChart intervals={intervals} />);
    expect(screen.getByText(/Average: 1 days/i)).toBeInTheDocument();
    expect(document.querySelector(".recharts-responsive-container")).toBeInTheDocument();
  });

  it("handles same day refills with 0 days", () => {
    const intervals: RefillInterval[] = [
      { date: "2024-03-01", daysSinceLastRefill: null, units: 100 },
      { date: "2024-03-01", daysSinceLastRefill: 0, units: 50 },
    ];

    render(<RefillAnalysisChart intervals={intervals} />);
    expect(screen.getByText(/Refill Frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/Average: 0 days/i)).toBeInTheDocument();
  });
});
