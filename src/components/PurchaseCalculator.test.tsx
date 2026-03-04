import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PurchaseCalculator } from "./PurchaseCalculator";

describe("PurchaseCalculator", () => {
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
