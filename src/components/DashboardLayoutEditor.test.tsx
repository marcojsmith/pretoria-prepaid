import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardLayoutEditor } from "./DashboardLayoutEditor";
import type { CardConfig } from "@/hooks/useDashboardLayout";

let capturedOnDragEnd: ((event: unknown) => void) | null = null;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragEnd: (e: unknown) => void;
  }) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  closestCenter: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  // eslint-disable-next-line llm-core/max-params
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
}));

vi.mock("@/components/DashboardLayoutItem", () => ({
  DashboardLayoutItem: ({ card }: { card: { id: string } }) => (
    <div data-testid={`item-${card.id}`}>{card.id}</div>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const mockCards: CardConfig[] = [
  { id: "consumption-stats", visible: true },
  { id: "dashboard-stats", visible: true },
  { id: "tier-progress", visible: false },
];

describe("DashboardLayoutEditor", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnCardsChange = vi.fn();
  const mockOnToggleVisibility = vi.fn();
  const mockOnReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnDragEnd = null;
  });

  it("renders cards list when open", () => {
    render(
      <DashboardLayoutEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        cards={mockCards}
        onCardsChange={mockOnCardsChange}
        onToggleVisibility={mockOnToggleVisibility}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByTestId("item-consumption-stats")).toBeInTheDocument();
    expect(screen.getByTestId("item-dashboard-stats")).toBeInTheDocument();
  });

  it("shows visible count of cards", () => {
    render(
      <DashboardLayoutEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        cards={mockCards}
        onCardsChange={mockOnCardsChange}
        onToggleVisibility={mockOnToggleVisibility}
        onReset={mockOnReset}
      />
    );
    expect(screen.getByText(/2 of 3 shown/)).toBeInTheDocument();
  });

  it("calls onReset when reset button is clicked", () => {
    render(
      <DashboardLayoutEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        cards={mockCards}
        onCardsChange={mockOnCardsChange}
        onToggleVisibility={mockOnToggleVisibility}
        onReset={mockOnReset}
      />
    );
    fireEvent.click(screen.getByText("Reset to default"));
    expect(mockOnReset).toHaveBeenCalled();
  });

  it("handleDragEnd reorders cards when active and over differ", () => {
    render(
      <DashboardLayoutEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        cards={mockCards}
        onCardsChange={mockOnCardsChange}
        onToggleVisibility={mockOnToggleVisibility}
        onReset={mockOnReset}
      />
    );
    capturedOnDragEnd?.({ active: { id: "card1" }, over: { id: "card2" } });
    expect(mockOnCardsChange).toHaveBeenCalled();
  });

  it("handleDragEnd does nothing when active equals over", () => {
    render(
      <DashboardLayoutEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        cards={mockCards}
        onCardsChange={mockOnCardsChange}
        onToggleVisibility={mockOnToggleVisibility}
        onReset={mockOnReset}
      />
    );
    capturedOnDragEnd?.({ active: { id: "card1" }, over: { id: "card1" } });
    expect(mockOnCardsChange).not.toHaveBeenCalled();
  });

  it("handleDragEnd does nothing when over is null", () => {
    render(
      <DashboardLayoutEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        cards={mockCards}
        onCardsChange={mockOnCardsChange}
        onToggleVisibility={mockOnToggleVisibility}
        onReset={mockOnReset}
      />
    );
    capturedOnDragEnd?.({ active: { id: "card1" }, over: null });
    expect(mockOnCardsChange).not.toHaveBeenCalled();
  });
});
