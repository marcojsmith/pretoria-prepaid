import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PurchaseCalculator } from "./PurchaseCalculator";
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

describe("PurchaseCalculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (convexReact.useQuery as any).mockReturnValue(MOCK_RATES);
  });

  it("renders correctly", () => {
    render(
      <PurchaseCalculator unitsAlreadyBought={0} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );
    expect(screen.getByText(/Smart Calculator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kWh to buy/i)).toBeInTheDocument();
  });

  it("suggests units based on average usage", () => {
    render(
      <PurchaseCalculator unitsAlreadyBought={100} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );
    expect(screen.getByText((content) => content.includes("200 more kWh"))).toBeInTheDocument();
  });

  it("calculates breakdown when units are entered", () => {
    render(
      <PurchaseCalculator unitsAlreadyBought={0} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );

    fireEvent.change(screen.getByLabelText(/kWh to buy/i), { target: { value: "100" } });

    expect(screen.getByText(/Price Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Cost/i)).toBeInTheDocument();
    expect(screen.getAllByText(/R 342.59/i).length).toBeGreaterThan(0); // Appears multiple times
  });

  it("calls onSavePurchase when save button is clicked", () => {
    const onSavePurchase = vi.fn();
    render(
      <PurchaseCalculator
        unitsAlreadyBought={0}
        averageMonthlyUsage={300}
        daysLeftInMonth={15}
        onSavePurchase={onSavePurchase}
      />
    );

    fireEvent.change(screen.getByLabelText(/kWh to buy/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /Save as Purchase/i }));

    expect(onSavePurchase).toHaveBeenCalledWith(100, expect.any(Number));
  });
});
