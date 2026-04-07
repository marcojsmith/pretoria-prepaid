import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TierProgress } from "./TierProgress";
import * as convexReact from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

const MOCK_RATES = [
  { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 0, max_units: 100, rate: 3.42585 },
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

describe("TierProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useQuery).mockReturnValue(MOCK_RATES);
  });

  it("shows loading state when rates are loading", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    render(<TierProgress unitsBought={0} />);

    // Loader2 renders as an SVG with animate-spin class
    const spinner = document.querySelector("svg.animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders tier progress for units within first tier", () => {
    render(<TierProgress unitsBought={50} />);

    expect(screen.getByText(/Tier 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/to next tier/i).length).toBeGreaterThan(0);
  });

  it("renders tier progress across multiple tiers", () => {
    render(<TierProgress unitsBought={200} />);

    expect(screen.getByText(/Tier 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2/i)).toBeInTheDocument();
    expect(screen.getByText(/101/)).toBeInTheDocument();
  });

  it("shows infinity for last tier max", () => {
    render(<TierProgress unitsBought={700} />);

    expect(screen.getByText(/Tier 4/i)).toBeInTheDocument();
    expect(screen.getByText(/\u221E/i)).toBeInTheDocument();
  });

  it("shows units to next tier when not at max", () => {
    render(<TierProgress unitsBought={50} />);

    expect(screen.getAllByText(/to next tier/i).length).toBeGreaterThanOrEqual(1);
  });

  it("does not show units to next tier when at last tier", () => {
    render(<TierProgress unitsBought={700} />);

    expect(screen.queryByText(/to next tier/i)).not.toBeInTheDocument();
  });
});
