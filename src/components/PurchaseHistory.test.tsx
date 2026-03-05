import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PurchaseHistory } from "./PurchaseHistory";

describe("PurchaseHistory", () => {
  it("renders empty state correctly", () => {
    render(<PurchaseHistory purchases={[]} onDelete={() => {}} />);
    expect(screen.getByText(/No purchases recorded yet/i)).toBeInTheDocument();
  });

  it("renders list of purchases correctly", () => {
    const purchases = [
      {
        _id: "1",
        date: "2024-01-01",
        units: 100,
        cost: 342,
        amountPaid: 342,
        tierBreakdown: [{ tier: 1, label: "Tier 1", units: 100, rate: 3.42, cost: 342 }],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={() => {}} />);
    expect(screen.getByText(/100 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/R 342.00/)).toBeInTheDocument();
  });
});
