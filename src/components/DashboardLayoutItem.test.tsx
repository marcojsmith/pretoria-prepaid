import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayoutItem } from "./DashboardLayoutItem";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  SortableContext: vi.fn(({ children }: { children: React.ReactNode }) => children),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ""),
    },
  },
}));

describe("DashboardLayoutItem", () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render card name and description", () => {
    render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: true }}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("Current balance, units bought & burn rate")).toBeInTheDocument();
  });

  it("should render eye icon when card is visible", () => {
    render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: true }}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByLabelText("Hide This Month")).toBeInTheDocument();
  });

  it("should render eye-off icon when card is hidden", () => {
    render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: false }}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByLabelText("Show This Month")).toBeInTheDocument();
  });

  it("should call onToggle when toggle button is clicked", () => {
    render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: true }}
        onToggle={mockOnToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /hide/i }));
    expect(mockOnToggle).toHaveBeenCalledWith("consumption-stats");
  });

  it("should apply opacity class when card is not visible", () => {
    const { container } = render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: false }}
        onToggle={mockOnToggle}
      />
    );

    expect(container.firstChild).toHaveClass("opacity-50");
  });

  it("should not apply opacity class when card is visible", () => {
    const { container } = render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: true }}
        onToggle={mockOnToggle}
      />
    );

    expect(container.firstChild).not.toHaveClass("opacity-50");
  });

  it("should have drag handle with grab cursor", () => {
    render(
      <DashboardLayoutItem
        card={{ id: "consumption-stats", visible: true }}
        onToggle={mockOnToggle}
      />
    );

    const dragButton = screen.getByRole("button", { name: /drag to reorder/i });
    expect(dragButton).toHaveClass("cursor-grab");
  });

  it("should render different card types correctly", () => {
    const { rerender } = render(
      <DashboardLayoutItem card={{ id: "tier-progress", visible: true }} onToggle={mockOnToggle} />
    );

    expect(screen.getByText("Tier Progress")).toBeInTheDocument();

    rerender(
      <DashboardLayoutItem card={{ id: "monthly-stats", visible: true }} onToggle={mockOnToggle} />
    );

    expect(screen.getByText("Monthly History")).toBeInTheDocument();
  });
});
