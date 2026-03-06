import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReadingHistory } from "./ReadingHistory";
import { Id } from "../../convex/_generated/dataModel";

describe("ReadingHistory", () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state correctly", () => {
    render(<ReadingHistory readings={[]} onDelete={mockOnDelete} />);
    expect(screen.getByText(/No readings logged yet/i)).toBeInTheDocument();
  });

  it("renders empty state with filters correctly", () => {
    render(<ReadingHistory readings={[]} onDelete={mockOnDelete} isFiltered={true} />);
    expect(screen.getByText(/No readings match your filters/i)).toBeInTheDocument();
  });

  it("renders list of readings correctly and handles deletion", async () => {
    const readings = [
      {
        _id: "r1" as unknown as Id<"meter_readings">,
        reading: 120.5,
        date: "2024-03-05",
      },
    ];
    render(<ReadingHistory readings={readings} onDelete={mockOnDelete} />);

    expect(screen.getByText("120.5 kWh")).toBeInTheDocument();
    expect(screen.getByText(/5 March 2024/)).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(mockOnDelete).toHaveBeenCalledWith("r1");
  });

  it("handles 'Show More' manual click", () => {
    const manyReadings = Array.from({ length: 15 }, (_, i) => ({
      _id: `r${i}` as unknown as Id<"meter_readings">,
      reading: 100 + i,
      date: `2024-03-${String(i + 1).padStart(2, "0")}`,
    }));

    render(<ReadingHistory readings={manyReadings} onDelete={mockOnDelete} />);

    // Initially shows 10
    expect(screen.queryByText("110 kWh")).not.toBeInTheDocument();
    expect(screen.getByText(/5 remaining/)).toBeInTheDocument();

    // Find and click the hidden button (since we use sr-only but it's still in DOM)
    const showMoreBtn = screen.getByText(/Show More/).closest("button");
    fireEvent.click(showMoreBtn!);

    expect(screen.getByText("110 kWh")).toBeInTheDocument();
  });
});
