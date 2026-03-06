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
    vi.mocked(convexReact.useQuery).mockReturnValue(MOCK_RATES);
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
    expect(screen.getAllByText(/R 342.59/i).length).toBeGreaterThan(0);
  });

  it("calls onSavePurchase when save button is clicked with balance", () => {
    const onSavePurchase = vi.fn();
    render(
      <PurchaseCalculator
        unitsAlreadyBought={0}
        averageMonthlyUsage={300}
        daysLeftInMonth={15}
        onSavePurchase={onSavePurchase}
      />
    );

    fireEvent.change(screen.getByLabelText(/Current Meter \(kWh\)/i), {
      target: { value: "15.5" },
    });
    fireEvent.change(screen.getByLabelText(/kWh to buy/i), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /Save as Purchase/i }));

    expect(onSavePurchase).toHaveBeenCalledWith(100, expect.any(Number), 15.5);
  });

  it("updates kWh to buy when current meter reading is entered", () => {
    // Fix the date to ensure consistent daysInMonth (March = 31 days)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z")); // 15 days left in March (31 - 16 = 15)

    render(
      <PurchaseCalculator
        unitsAlreadyBought={50}
        averageMonthlyUsage={300}
        daysLeftInMonth={15} // 31 days in March, so 16 elapsed
      />
    );

    // Initial suggestion based on avg usage: 300 - 50 = 250
    const targetInput = screen.getByLabelText(/kWh to buy/i) as HTMLInputElement;
    expect(targetInput.value).toBe("250");

    // Enter meter reading: 20 kWh
    // Consumed = 50 - 20 = 30.
    // Days elapsed = 31 - 15 = 16.
    // Burn rate = 30 / 16 = 1.875 kWh/day.
    // Needed remaining = 1.875 * 15 = 28.125 kWh.
    // Needed to buy = 28.125 - 20 (already have) = 8.125.
    // Rounded to 1 decimal = 8.1.
    fireEvent.change(screen.getByLabelText(/Current Meter \(kWh\)/i), {
      target: { value: "20" },
    });

    expect(targetInput.value).toBe("8.1");

    vi.useRealTimers();
  });

  it("displays tier limit warning when purchase exceeds current tier capacity", () => {
    render(
      <PurchaseCalculator unitsAlreadyBought={80} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );

    // Tier 1 capacity: 100. unitsAlreadyBought: 80. Remaining: 20.
    // If we want to buy 50, it exceeds 20.
    fireEvent.change(screen.getByLabelText(/kWh to buy/i), { target: { value: "50" } });

    expect(screen.getByText(/Tier Limit Warning/i)).toBeInTheDocument();
    expect(screen.getByText(/Buying more than/i)).toBeInTheDocument();
    expect(screen.getAllByText(/R 68.52/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tier 1/i).length).toBeGreaterThan(0);
  });
});
