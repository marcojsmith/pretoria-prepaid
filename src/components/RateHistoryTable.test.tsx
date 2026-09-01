import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RateHistoryTable, BASELINE_EFFECTIVE_FROM } from "./RateHistoryTable";
import type { ElectricityRate } from "@/hooks/useRates";
import type { Id } from "../../convex/_generated/dataModel";

function rate(overrides: Omit<Partial<ElectricityRate>, "_id"> & { _id: string }): ElectricityRate {
  return {
    tier_number: 1,
    tier_label: "Tier 1",
    min_units: 1,
    max_units: 100,
    rate: 3.5,
    ...overrides,
    _id: overrides._id as Id<"electricity_rates">,
  };
}

describe("RateHistoryTable", () => {
  it("shows an empty state when there is no history", () => {
    render(<RateHistoryTable history={[]} />);
    expect(screen.getByText(/No rates have been configured yet\./i)).toBeInTheDocument();
  });

  it("groups rows without an effectiveFrom under the baseline date", () => {
    render(<RateHistoryTable history={[rate({ _id: "1", tier_number: 1, rate: 3.42585 })]} />);

    // Baseline is 2025-07-01, formatted en-ZA as "1 Jul 2025".
    expect(screen.getByText(/1 Jul 2025/)).toBeInTheDocument();
  });

  it("renders one column per distinct tier across all periods", () => {
    render(
      <RateHistoryTable
        history={[
          rate({ _id: "1", tier_number: 1, effectiveFrom: "2025-07-01" }),
          rate({ _id: "2", tier_number: 2, tier_label: "Tier 2", effectiveFrom: "2025-07-01" }),
        ]}
      />
    );

    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText("Tier 2")).toBeInTheDocument();
  });

  it("marks the most recent already-started period as Current, and future periods as Upcoming", () => {
    render(
      <RateHistoryTable
        history={[
          rate({ _id: "1", rate: 3.42585, effectiveFrom: "2020-01-01" }),
          rate({ _id: "2", rate: 9.99, effectiveFrom: "2999-01-01" }),
        ]}
      />
    );

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("shows a percent increase from the previous period", () => {
    render(
      <RateHistoryTable
        history={[
          rate({ _id: "1", tier_number: 1, rate: 4.4, effectiveFrom: "2026-01-01" }),
          rate({ _id: "2", tier_number: 1, rate: 4.0, effectiveFrom: "2025-01-01" }),
        ]}
      />
    );

    expect(screen.getByText("+10.0%")).toBeInTheDocument();
  });

  it("shows a percent decrease from the previous period", () => {
    render(
      <RateHistoryTable
        history={[
          rate({ _id: "1", tier_number: 1, rate: 3.6, effectiveFrom: "2026-01-01" }),
          rate({ _id: "2", tier_number: 1, rate: 4.0, effectiveFrom: "2025-01-01" }),
        ]}
      />
    );

    expect(screen.getByText("-10.0%")).toBeInTheDocument();
  });

  it("hides negligible changes below the threshold", () => {
    render(
      <RateHistoryTable
        history={[
          rate({ _id: "1", tier_number: 1, rate: 4.001, effectiveFrom: "2026-01-01" }),
          rate({ _id: "2", tier_number: 1, rate: 4.0, effectiveFrom: "2025-01-01" }),
        ]}
      />
    );

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows a dash for a tier missing from a given period", () => {
    render(
      <RateHistoryTable
        history={[
          rate({ _id: "1", tier_number: 1, effectiveFrom: "2026-01-01" }),
          rate({ _id: "2", tier_number: 2, tier_label: "Tier 2", effectiveFrom: "2025-01-01" }),
        ]}
      />
    );

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("exports BASELINE_EFFECTIVE_FROM as the 2025/26 tariff start date", () => {
    expect(BASELINE_EFFECTIVE_FROM).toBe("2025-07-01");
  });
});
