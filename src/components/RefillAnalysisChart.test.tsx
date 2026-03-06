import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RefillAnalysisChart } from "./RefillAnalysisChart";
import { RefillInterval } from "@/lib/electricity";

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
    // 05 Mar and 10 Mar should be visible (South African locale uses day first)
    // Use flexible regex to match different locales (e.g., "05 Mar" or "Mar 05")
    expect(screen.getByText(/05.*Mar|Mar.*05/i)).toBeInTheDocument();
    expect(screen.getByText(/10.*Mar|Mar.*10/i)).toBeInTheDocument();
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

    const { container } = render(<RefillAnalysisChart intervals={intervals} />);
    // The chart container div with class flex-1 represents bars
    const bars = container.querySelectorAll(".flex-1.flex.flex-col.items-center");
    expect(bars.length).toBe(7);
  });
});
