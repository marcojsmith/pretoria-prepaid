import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

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

export const DEFAULT_CARDS: CardConfig[] = [
  { id: "consumption-stats", visible: true },
  { id: "dashboard-stats", visible: true },
  { id: "tier-progress", visible: true },
  { id: "monthly-stats", visible: true },
  { id: "yearly-chart", visible: true },
  { id: "daily-chart", visible: true },
  { id: "frequency-chart", visible: true },
];

const VALID_IDS = new Set<string>(DEFAULT_CARDS.map((c) => c.id));

function isValidLayout(cards: unknown): cards is CardConfig[] {
  if (!Array.isArray(cards)) return false;
  if (cards.length !== DEFAULT_CARDS.length) return false;
  const items = cards as Array<Record<string, unknown>>;
  if (!items.every((c) => typeof c["id"] === "string" && typeof c["visible"] === "boolean"))
    return false;
  const typed = items as Array<{ id: string; visible: boolean }>;
  const savedIds = new Set<string>(typed.map((c) => c.id));
  if (savedIds.size !== typed.length) return false;
  if (!DEFAULT_CARDS.every((c) => savedIds.has(c.id))) return false;
  return typed.every((c) => VALID_IDS.has(c.id));
}

function loadFromStorage(): CardConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARDS;
    const parsed: unknown = JSON.parse(raw);
    return isValidLayout(parsed) ? parsed : DEFAULT_CARDS;
  } catch {
    return DEFAULT_CARDS;
  }
}

function saveToStorage(cards: CardConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

interface UseDashboardLayoutReturn {
  cards: CardConfig[];
  setCards: (cards: CardConfig[]) => void;
  toggleVisibility: (id: CardId) => void;
  resetLayout: () => void;
  syncing: boolean;
}

export function useDashboardLayout(): UseDashboardLayoutReturn {
  const [cards, setCardsState] = useState<CardConfig[]>(loadFromStorage);
  const profile = useQuery(api.users.getProfile);
  const updateLayoutMutation = useMutation(api.users.updateDashboardLayout);
  const serverSyncedRef = useRef(false);
  const localEditedRef = useRef(false);

  useEffect(() => {
    if (
      profile === undefined ||
      profile === null ||
      serverSyncedRef.current ||
      localEditedRef.current
    )
      return;
    serverSyncedRef.current = true;
    const serverLayout = profile.dashboardLayout;
    if (!serverLayout || !isValidLayout(serverLayout)) return;
    setCardsState(serverLayout);
    saveToStorage(serverLayout);
  }, [profile]);

  function setCards(updated: CardConfig[]): void {
    localEditedRef.current = true;
    setCardsState(updated);
    saveToStorage(updated);
    void updateLayoutMutation({ layout: updated });
  }

  function toggleVisibility(id: CardId): void {
    setCards(cards.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }

  function resetLayout(): void {
    setCards([...DEFAULT_CARDS]);
  }

  return {
    cards,
    setCards,
    toggleVisibility,
    resetLayout,
    syncing: profile === undefined,
  };
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
