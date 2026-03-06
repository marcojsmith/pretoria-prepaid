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

    expect(screen.getByText(/100 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/R 342.00/)).toBeInTheDocument();

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

    expect(screen.getByText(/Pending Sync/i)).toBeInTheDocument();
  });
});
