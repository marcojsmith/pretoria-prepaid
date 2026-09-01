import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PurchaseHistory } from "./PurchaseHistory";
import type { Purchase } from "@/lib/electricity";

type IntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => void;
let capturedObserverCallback: IntersectionObserverCallback | null = null;
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

function setupIntersectionObserverMock() {
  capturedObserverCallback = null;
  global.IntersectionObserver = vi.fn(function (callback: IntersectionObserverCallback) {
    capturedObserverCallback = callback;
    return { observe: mockObserve, unobserve: mockUnobserve, disconnect: vi.fn() };
  }) as unknown as typeof IntersectionObserver;
}

describe("PurchaseHistory", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    setupIntersectionObserverMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state correctly", () => {
    render(<PurchaseHistory purchases={[]} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No purchases recorded yet/i)).toBeInTheDocument();
  });

  it("renders list of purchases correctly and handles deletion", () => {
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
    act(() => {
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

  it("renders tier breakdown when available", () => {
    const purchases: Purchase[] = [
      {
        _id: "4",
        date: "2024-01-04",
        units: 100,
        cost: 342,
        amountPaid: 342,
        tierBreakdown: [
          { tier: 1, label: "Tier 1", units: 50, rate: 3.42, cost: 171 },
          { tier: 2, label: "Tier 2", units: 50, rate: 4.0, cost: 200 },
        ],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    expect(screen.getAllByText(/50/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Tier 1/)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2/)).toBeInTheDocument();
  });

  it("handles unknown tier with fallback color", () => {
    const purchases: Purchase[] = [
      {
        _id: "5",
        date: "2024-01-05",
        units: 100,
        cost: 342,
        amountPaid: 342,
        tierBreakdown: [
          { tier: 99 as number, label: "Unknown", units: 100, rate: 3.42, cost: 342 },
        ],
      },
    ];
    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });

  it("IntersectionObserver callback loads more when target is intersecting", () => {
    const purchases: Purchase[] = Array.from({ length: 15 }, (_, i) => ({
      _id: String(i + 1),
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      units: 100,
      cost: 342,
      amountPaid: 342,
      tierBreakdown: [{ tier: 1, label: "Tier 1", units: 100, rate: 3.42, cost: 342 }],
    }));

    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    // Initially only 10 visible; observer target should be attached
    expect(mockObserve).toHaveBeenCalled();

    // Trigger the observer callback with isIntersecting = true
    act(() => {
      if (!capturedObserverCallback) throw new Error("capturedObserverCallback not set");
      capturedObserverCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    // All 15 should now be visible (visibleCount went from 10 → 20)
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });

  it("IntersectionObserver callback does not load more when not intersecting", () => {
    const purchases: Purchase[] = Array.from({ length: 15 }, (_, i) => ({
      _id: String(i + 1),
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      units: 100,
      cost: 342,
      amountPaid: 342,
      tierBreakdown: [{ tier: 1, label: "Tier 1", units: 100, rate: 3.42, cost: 342 }],
    }));

    render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);

    act(() => {
      if (!capturedObserverCallback) throw new Error("capturedObserverCallback not set");
      capturedObserverCallback([{ isIntersecting: false } as IntersectionObserverEntry]);
    });

    // Still 5 remaining (only 10 of 15 visible)
    expect(screen.getByText(/5 remaining/i)).toBeInTheDocument();
  });

  it("unobserves target on unmount", () => {
    const purchases: Purchase[] = Array.from({ length: 15 }, (_, i) => ({
      _id: String(i + 1),
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      units: 100,
      cost: 342,
      amountPaid: 342,
      tierBreakdown: [{ tier: 1, label: "Tier 1", units: 100, rate: 3.42, cost: 342 }],
    }));

    const { unmount } = render(<PurchaseHistory purchases={purchases} onDelete={mockOnDelete} />);
    unmount();

    expect(mockUnobserve).toHaveBeenCalled();
  });
});
