import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { LayoutDashboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { DashboardLayoutItem } from "@/components/DashboardLayoutItem";
import type { CardConfig, CardId } from "@/hooks/useDashboardLayout";

interface DashboardLayoutEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CardConfig[];
  onCardsChange: (cards: CardConfig[]) => void;
  onToggleVisibility: (id: CardId) => void;
  onReset: () => void;
}

export function DashboardLayoutEditor({
  open,
  onOpenChange,
  cards,
  onCardsChange,
  onToggleVisibility,
  onReset,
}: DashboardLayoutEditorProps): JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    onCardsChange(arrayMove(cards, oldIndex, newIndex));
  }

  const visibleCount = cards.filter((c) => c.visible).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            <SheetTitle className="text-base">Customise Dashboard</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Drag to reorder. Tap the eye to show or hide a card.{" "}
            <span className="text-foreground/70">
              {visibleCount} of {cards.length} shown
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {cards.map((card) => (
                  <DashboardLayoutItem key={card.id} card={card} onToggle={onToggleVisibility} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="border-t px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onReset}
            type="button"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
