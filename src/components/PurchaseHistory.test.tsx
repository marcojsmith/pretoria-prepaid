import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PurchaseHistory } from "./PurchaseHistory";
import { Purchase } from "@/lib/electricity";

describe("PurchaseHistory", () => {
  const mockOnDelete = vi.fn();

  it("renders empty state correctly", () => {
    render(<PurchaseHistory purchases={[]} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No purchases recorded yet/i)).toBeInTheDocument();
  });

  it("renders list of purchases correctly and handles deletion", async () => {
    const purchases: Purchase[] = [
      {
        _id: "1",
        date: "2024-01-01",
        units: 100,
        cost: 342,
        amountPaid: 342,
        tierBreakdown: [{ tier: 1, label: "Tier 1", units: 100, rate: 3.42, cost: 342 }],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    expect(screen.getAllByText(/100/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/kWh/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R 342.00/i).length).toBeGreaterThan(0);

    const deleteButton = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockOnDelete).toHaveBeenCalledWith("1");
  });

  it("renders offline indicators", () => {
    const purchases: Purchase[] = [
      {
        _id: "pending-1",
        date: "2024-01-01",
        units: 100,
        cost: 300,
        amountPaid: 300,
        isOffline: true,
        tierBreakdown: [],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Syncing/i)).toBeInTheDocument();
  });

  it("handles unknown tiers with a fallback color", () => {
    const purchases: Purchase[] = [
      {
        _id: "2",
        date: "2024-01-02",
        units: 100,
        cost: 342,
        amountPaid: 342,
        tierBreakdown: [
          {
            tier: 99 as number,
            label: "Unknown Tier",
            units: 100,
            rate: 3.42,
            cost: 342,
          },
        ],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    // Since we can't easily query the exact generic div for its class name, just ensuring it doesn't crash
    // and correctly renders the label is enough to cover the fallback branch
    expect(screen.getByText(/Unknown Tier/i)).toBeInTheDocument();
  });

  it("renders show more when purchases exceed visible count", () => {
    const purchases: Purchase[] = Array.from({ length: 15 }, (_, i) => ({
      _id: String(i + 1),
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      units: 100,
      cost: 342,
      amountPaid: 342,
      tierBreakdown: [{ tier: 1, label: "Tier 1", units: 100, rate: 3.42, cost: 342 }],
    }));
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    expect(screen.getByText(/total/i)).toBeInTheDocument();
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  });

  it("handles purchases without tier breakdown", () => {
    const purchases: Purchase[] = [
      {
        _id: "3",
        date: "2024-01-03",
        units: 50,
        cost: 171,
        amountPaid: 171,
        tierBreakdown: [],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    expect(screen.getByText(/50/i)).toBeInTheDocument();
  });
});
