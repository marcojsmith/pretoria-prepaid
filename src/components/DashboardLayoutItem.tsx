import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARD_LABELS } from "@/hooks/useDashboardLayout";
import type { CardConfig, CardId } from "@/hooks/useDashboardLayout";

interface DashboardLayoutItemProps {
  card: CardConfig;
  onToggle: (id: CardId) => void;
}

export function DashboardLayoutItem({ card, onToggle }: DashboardLayoutItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = CARD_LABELS[card.id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex items-center gap-3 rounded-lg border bg-card p-3",
        "transition-shadow duration-150",
        isDragging ? "z-10 shadow-lg ring-1 ring-primary/30" : "shadow-none",
        !card.visible ? "opacity-50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${label.name}`}
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label.name}</p>
        <p className="truncate text-xs text-muted-foreground">{label.description}</p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onToggle(card.id)}
        aria-label={card.visible ? `Hide ${label.name}` : `Show ${label.name}`}
        type="button"
      >
        {card.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
    </div>
  );
}
