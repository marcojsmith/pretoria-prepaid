import { useState } from "react";

export type CardId =
  | "consumption-stats"
  | "dashboard-stats"
  | "tier-progress"
  | "monthly-stats"
  | "yearly-chart"
  | "daily-chart"
  | "frequency-chart";

export interface CardConfig {
  id: CardId;
  visible: boolean;
}

const STORAGE_KEY = "dashboard_layout_v1";

const DEFAULT_CARDS: CardConfig[] = [
  { id: "consumption-stats", visible: true },
  { id: "dashboard-stats", visible: true },
  { id: "tier-progress", visible: true },
  { id: "monthly-stats", visible: true },
  { id: "yearly-chart", visible: true },
  { id: "daily-chart", visible: true },
  { id: "frequency-chart", visible: true },
];

function loadLayout(): CardConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CARDS;
    }
    const parsed = JSON.parse(raw) as CardConfig[];
    const knownIds = new Set(DEFAULT_CARDS.map((c) => c.id));
    const savedIds = new Set(parsed.map((c) => c.id));
    const hasAllCards = DEFAULT_CARDS.every((c) => savedIds.has(c.id));
    const hasNoExtra = parsed.every((c) => knownIds.has(c.id));
    if (!hasAllCards || !hasNoExtra) {
      return DEFAULT_CARDS;
    }
    return parsed;
  } catch {
    return DEFAULT_CARDS;
  }
}

function saveLayout(cards: CardConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

interface UseDashboardLayoutReturn {
  cards: CardConfig[];
  setCards: (cards: CardConfig[]) => void;
  toggleVisibility: (id: CardId) => void;
  resetLayout: () => void;
}

export function useDashboardLayout(): UseDashboardLayoutReturn {
  const [cards, setCardsState] = useState<CardConfig[]>(loadLayout);

  function setCards(updated: CardConfig[]): void {
    setCardsState(updated);
    saveLayout(updated);
  }

  function toggleVisibility(id: CardId): void {
    setCards(cards.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }

  function resetLayout(): void {
    setCards([...DEFAULT_CARDS]);
  }

  return { cards, setCards, toggleVisibility, resetLayout };
}

export const CARD_LABELS: Record<CardId, { name: string; description: string }> = {
  "consumption-stats": {
    name: "This Month",
    description: "Current balance, units bought & burn rate",
  },
  "dashboard-stats": {
    name: "3-Month Averages",
    description: "Average usage, spend & blended rate",
  },
  "tier-progress": {
    name: "Tier Progress",
    description: "How far through each pricing tier",
  },
  "monthly-stats": {
    name: "Monthly History",
    description: "Month-by-month usage breakdown",
  },
  "yearly-chart": {
    name: "Yearly Consumption",
    description: "Last 12 months of unit purchases",
  },
  "daily-chart": {
    name: "Daily Average",
    description: "Average daily usage per month",
  },
  "frequency-chart": {
    name: "Purchase Frequency",
    description: "How often you buy electricity",
  },
};
