import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReadingHistory } from "./ReadingHistory";
import type { Id } from "../../convex/_generated/dataModel";

type IntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => void;
let capturedObserverCallback: IntersectionObserverCallback | null = null;
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

function setupIntersectionObserverMock() {
  capturedObserverCallback = null;
  global.IntersectionObserver = vi.fn((callback: IntersectionObserverCallback) => {
    capturedObserverCallback = callback;
    return { observe: mockObserve, unobserve: mockUnobserve, disconnect: vi.fn() };
  }) as unknown as typeof IntersectionObserver;
}

describe("ReadingHistory", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockObserve.mockClear();
    mockUnobserve.mockClear();
    setupIntersectionObserverMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state correctly", () => {
    render(<ReadingHistory readings={[]} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No readings logged yet/i)).toBeInTheDocument();
  });

  it("renders empty state with filters correctly", () => {
    render(<ReadingHistory readings={[]} onDelete={mockOnDelete} isFiltered={true} />);
    expect(screen.getByText(/No readings match your filters/i)).toBeInTheDocument();
  });

  it("renders purchase reading with pre→post correctly", () => {
    const readings = [
      {
        _id: "r1" as unknown as Id<"meter_readings">,
        readingPre: 80,
        readingPost: 120.5,
        date: "2024-03-05",
        source: "purchase" as const,
      },
    ];
    render(<ReadingHistory readings={readings} onDelete={mockOnDelete} />);

    expect(screen.getByText(/80 kWh.*120.5 kWh/)).toBeInTheDocument();
    expect(screen.getByText(/40.5 units purchased/)).toBeInTheDocument();
    expect(screen.getByText(/5 March 2024/)).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button");
    act(() => {
      fireEvent.click(deleteBtn);
    });

    expect(mockOnDelete).toHaveBeenCalledWith("r1");
  });

  it("renders onboarding reading with starting point", () => {
    const readings = [
      {
        _id: "r1" as unknown as Id<"meter_readings">,
        readingPre: 200,
        readingPost: 200,
        date: "2024-03-05",
        source: "onboarding" as const,
      },
    ];
    render(<ReadingHistory readings={readings} onDelete={mockOnDelete} />);

    expect(screen.getByText("200 kWh")).toBeInTheDocument();
    expect(screen.getByText(/Starting point/)).toBeInTheDocument();
  });

  it("handles 'Show More' manual click", () => {
    const manyReadings = Array.from({ length: 15 }, (_, i) => ({
      _id: `r${i}` as unknown as Id<"meter_readings">,
      readingPre: 100 + i,
      readingPost: 150 + i,
      date: `2024-03-${String(i + 1).padStart(2, "0")}`,
      source: "purchase" as const,
    }));

    render(<ReadingHistory readings={manyReadings} onDelete={mockOnDelete} />);

    // Initially shows 10
    expect(screen.queryByText(/110 kWh.*160 kWh/)).not.toBeInTheDocument();
    expect(screen.getByText(/5 remaining/)).toBeInTheDocument();

    // Find and click the hidden button (since we use sr-only but it's still in DOM)
    const showMoreBtn = screen.getByText(/Show More/).closest("button");
    if (!showMoreBtn) throw new Error("showMoreBtn not found");
    fireEvent.click(showMoreBtn);

    expect(screen.getByText(/110 kWh.*160 kWh/)).toBeInTheDocument();
  });

  it("renders reading with deleted item", () => {
    const readings = [
      {
        _id: "r1" as unknown as Id<"meter_readings">,
        readingPre: 80,
        readingPost: 120.5,
        date: "2024-03-05",
        source: "purchase" as const,
      },
    ];
    const { rerender } = render(<ReadingHistory readings={readings} onDelete={mockOnDelete} />);

    expect(screen.getByText(/120.5 kWh/)).toBeInTheDocument();

    // Delete the reading
    const deleteBtn = screen.getByRole("button");
    fireEvent.click(deleteBtn);
    expect(mockOnDelete).toHaveBeenCalledWith("r1");

    // Rerender with empty array
    rerender(<ReadingHistory readings={[]} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No readings logged yet/i)).toBeInTheDocument();
  });

  it("IntersectionObserver callback loads more readings when intersecting", () => {
    const manyReadings = Array.from({ length: 15 }, (_, i) => ({
      _id: `r${i}` as unknown as Id<"meter_readings">,
      readingPre: 100 + i,
      readingPost: 150 + i,
      date: `2024-03-${String(i + 1).padStart(2, "0")}`,
      source: "purchase" as const,
    }));

    render(<ReadingHistory readings={manyReadings} onDelete={mockOnDelete} />);

    expect(mockObserve).toHaveBeenCalled();

    // Trigger intersection observer callback
    act(() => {
      if (!capturedObserverCallback) throw new Error("capturedObserverCallback not set");
      capturedObserverCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    // All 15 visible now (visibleCount 10 → 20)
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });

  it("unobserves reading target on unmount", () => {
    const manyReadings = Array.from({ length: 15 }, (_, i) => ({
      _id: `r${i}` as unknown as Id<"meter_readings">,
      readingPre: 100 + i,
      readingPost: 150 + i,
      date: `2024-03-${String(i + 1).padStart(2, "0")}`,
      source: "purchase" as const,
    }));

    const { unmount } = render(<ReadingHistory readings={manyReadings} onDelete={mockOnDelete} />);
    unmount();

    expect(mockUnobserve).toHaveBeenCalled();
  });

  it("handles mixed source types", () => {
    const readings = [
      {
        _id: "r1" as unknown as Id<"meter_readings">,
        readingPre: 100,
        readingPost: 100,
        date: "2024-03-01",
        source: "onboarding" as const,
      },
      {
        _id: "r2" as unknown as Id<"meter_readings">,
        readingPre: 100,
        readingPost: 200,
        date: "2024-03-05",
        source: "purchase" as const,
      },
    ];
    render(<ReadingHistory readings={readings} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Starting point/)).toBeInTheDocument();
    expect(screen.getByText(/100 units purchased/)).toBeInTheDocument();
  });
});
