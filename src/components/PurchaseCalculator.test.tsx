import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PurchaseCalculator } from "./PurchaseCalculator";
import { useRates } from "../hooks/useRates";
import type { Id } from "../../convex/_generated/dataModel";

vi.mock("../hooks/useRates");

const MOCK_RATES = [
  {
    _id: "1" as Id<"electricity_rates">,
    tier_number: 1,
    tier_label: "Tier 1",
    min_units: 1,
    max_units: 100,
    rate: 3.42585,
  },
  {
    _id: "2" as Id<"electricity_rates">,
    tier_number: 2,
    tier_label: "Tier 2",
    min_units: 101,
    max_units: 400,
    rate: 4.00936,
  },
  {
    _id: "3" as Id<"electricity_rates">,
    tier_number: 3,
    tier_label: "Tier 3",
    min_units: 401,
    max_units: 650,
    rate: 4.36816,
  },
  {
    _id: "4" as Id<"electricity_rates">,
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
    vi.mocked(useRates).mockReturnValue({
      rates: MOCK_RATES,
      loading: false,
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders correctly", () => {
    render(
      <PurchaseCalculator unitsAlreadyBought={0} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );
    expect(screen.getByText(/Smart Calculator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kWh to buy/i)).toBeInTheDocument();
  });

  it("suggests units based on average usage", () => {
    // March has 31 days: effectiveBurnRate = 300/31 ≈ 9.677, suggested = 9.677 * 15 - 0 = 145.2
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));
    render(
      <PurchaseCalculator unitsAlreadyBought={100} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );
    expect(screen.getByText((content) => content.includes("145.2 more kWh"))).toBeInTheDocument();
    vi.useRealTimers();
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

    expect(onSavePurchase).toHaveBeenCalledWith({
      units: 100,
      amount: expect.any(Number),
      currentBalance: 15.5,
    });
  });

  it("updates kWh to buy when current meter reading is entered", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));

    render(
      <PurchaseCalculator unitsAlreadyBought={50} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );

    // March has 31 days: effectiveBurnRate = 300/31 ≈ 9.677
    // suggestedUnits = 9.677 * 15 - 0 (no estimatedBalance) = 145.2
    const targetInput = screen.getByLabelText(/kWh to buy/i) as HTMLInputElement;
    expect(targetInput.value).toBe("145.2");

    fireEvent.change(screen.getByLabelText(/Current Meter \(kWh\)/i), {
      target: { value: "20" },
    });

    // neededToBuy = max(0, 9.677 * 15 - 20) = 125.2
    expect(targetInput.value).toBe("125.2");

    vi.useRealTimers();
  });

  it("displays tier limit warning when purchase exceeds current tier capacity", () => {
    render(
      <PurchaseCalculator unitsAlreadyBought={80} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );

    fireEvent.change(screen.getByLabelText(/kWh to buy/i), { target: { value: "50" } });

    expect(screen.getByText(/Tier Limit Warning/i)).toBeInTheDocument();
    expect(screen.getByText(/Buying more than/i)).toBeInTheDocument();
    expect(screen.getAllByText(/R 68.52/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tier 1/i).length).toBeGreaterThan(0);
  });

  it("shows loading state when rates are loading", () => {
    vi.mocked(useRates).mockReturnValue({
      rates: [],
      loading: true,
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });

    const { container } = render(
      <PurchaseCalculator unitsAlreadyBought={0} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );

    const spinner = container.querySelector("svg.animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("resets to suggested units when balance input is cleared", () => {
    // March has 31 days: effectiveBurnRate = 300/31 ≈ 9.677, suggested = 9.677 * 15 = 145.2
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-16T12:00:00Z"));
    render(
      <PurchaseCalculator unitsAlreadyBought={100} averageMonthlyUsage={300} daysLeftInMonth={15} />
    );

    const targetInput = screen.getByLabelText(/kWh to buy/i) as HTMLInputElement;
    expect(targetInput.value).toBe("145.2");

    fireEvent.change(screen.getByLabelText(/Current Meter \(kWh\)/i), {
      target: { value: "20" },
    });

    fireEvent.change(screen.getByLabelText(/Current Meter \(kWh\)/i), {
      target: { value: "" },
    });

    expect(targetInput.value).toBe("145.2");
    vi.useRealTimers();
  });

  it("uses backend dailyBurnRate when provided for suggested units and meter reading", () => {
    // When backend provides dailyBurnRate=8 and estimatedBalance=30:
    // suggestedUnits = 8 * 15 - 30 = 90
    render(
      <PurchaseCalculator
        unitsAlreadyBought={50}
        averageMonthlyUsage={300}
        daysLeftInMonth={15}
        dailyBurnRate={8}
        estimatedBalance={30}
      />
    );

    const targetInput = screen.getByLabelText(/kWh to buy/i) as HTMLInputElement;
    expect(targetInput.value).toBe("90");

    // After entering meter reading of 40: neededToBuy = 8 * 15 - 40 = 80
    fireEvent.change(screen.getByLabelText(/Current Meter \(kWh\)/i), {
      target: { value: "40" },
    });
    expect(targetInput.value).toBe("80");
  });

  it("shows 0 suggested units when burn rate and average usage are both zero", () => {
    render(
      <PurchaseCalculator
        unitsAlreadyBought={0}
        averageMonthlyUsage={0}
        daysLeftInMonth={15}
        dailyBurnRate={0}
        estimatedBalance={0}
      />
    );

    const targetInput = screen.getByLabelText(/kWh to buy/i) as HTMLInputElement;
    expect(targetInput.value).toBe("");
  });
});
