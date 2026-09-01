import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardLayout, DEFAULT_CARDS, type CardConfig } from "./useDashboardLayout";
import { useQuery, useMutation } from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const mockSetItem = vi.fn();
const mockGetItem = vi.fn();
const mockRemoveItem = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDashboardLayout", () => {
  const mockUpdateLayout = vi.fn();

  beforeEach(() => {
    vi.mocked(useMutation).mockReturnValue(
      mockUpdateLayout as unknown as ReturnType<typeof useMutation>
    );
    mockGetItem.mockReturnValue(null);
  });

  it("should load default cards when localStorage is empty", () => {
    mockGetItem.mockReturnValue(null);
    vi.mocked(useQuery).mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.cards).toEqual(DEFAULT_CARDS);
  });

  it("should load cards from localStorage", () => {
    const savedLayout: CardConfig[] = [
      { id: "consumption-stats", visible: false },
      { id: "dashboard-stats", visible: true },
      { id: "tier-progress", visible: true },
      { id: "monthly-stats", visible: true },
      { id: "yearly-chart", visible: true },
      { id: "daily-chart", visible: true },
      { id: "frequency-chart", visible: true },
      { id: "cost-per-kwh-chart", visible: true },
    ];
    mockGetItem.mockReturnValue(JSON.stringify(savedLayout));
    vi.mocked(useQuery).mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.cards).toEqual(savedLayout);
  });

  it("should use server layout when available and valid", () => {
    const serverLayout: CardConfig[] = [
      { id: "consumption-stats", visible: false },
      { id: "dashboard-stats", visible: false },
      { id: "tier-progress", visible: true },
      { id: "monthly-stats", visible: true },
      { id: "yearly-chart", visible: true },
      { id: "daily-chart", visible: true },
      { id: "frequency-chart", visible: true },
      { id: "cost-per-kwh-chart", visible: true },
    ];
    vi.mocked(useQuery).mockReturnValue({ dashboardLayout: serverLayout });

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.cards).toEqual(serverLayout);
    expect(mockSetItem).toHaveBeenCalledWith("dashboard_layout_v1", JSON.stringify(serverLayout));
  });

  it("should not use server layout if invalid", () => {
    const invalidServerLayout = [{ id: "invalid" }];
    vi.mocked(useQuery).mockReturnValue({ dashboardLayout: invalidServerLayout });

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.cards).toEqual(DEFAULT_CARDS);
  });

  it("should set cards and save to localStorage", () => {
    vi.mocked(useQuery).mockReturnValue(null);
    mockGetItem.mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    const newCards: CardConfig[] = [
      { id: "consumption-stats", visible: false },
      { id: "dashboard-stats", visible: false },
      { id: "tier-progress", visible: false },
      { id: "monthly-stats", visible: true },
      { id: "yearly-chart", visible: true },
      { id: "daily-chart", visible: true },
      { id: "frequency-chart", visible: true },
      { id: "cost-per-kwh-chart", visible: true },
    ];

    act(() => {
      result.current.setCards(newCards);
    });

    expect(result.current.cards).toEqual(newCards);
    expect(mockSetItem).toHaveBeenCalledWith("dashboard_layout_v1", JSON.stringify(newCards));
    expect(mockUpdateLayout).toHaveBeenCalledWith({ layout: newCards });
  });

  it("should toggle visibility of a card", () => {
    vi.mocked(useQuery).mockReturnValue(null);
    mockGetItem.mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.toggleVisibility("consumption-stats");
    });

    expect(result.current.cards[0]?.visible).toBe(false);
  });

  it("should reset layout to defaults", () => {
    const savedLayout: CardConfig[] = [
      { id: "consumption-stats", visible: false },
      { id: "dashboard-stats", visible: false },
      { id: "tier-progress", visible: false },
      { id: "monthly-stats", visible: false },
      { id: "yearly-chart", visible: false },
      { id: "daily-chart", visible: false },
      { id: "frequency-chart", visible: false },
      { id: "cost-per-kwh-chart", visible: false },
    ];
    mockGetItem.mockReturnValue(JSON.stringify(savedLayout));
    vi.mocked(useQuery).mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.resetLayout();
    });

    expect(result.current.cards).toEqual(DEFAULT_CARDS);
    expect(mockSetItem).toHaveBeenCalledWith("dashboard_layout_v1", JSON.stringify(DEFAULT_CARDS));
  });

  it("should return syncing true when profile is loading", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.syncing).toBe(true);
  });

  it("should return syncing false when profile is loaded", () => {
    vi.mocked(useQuery).mockReturnValue({ dashboardLayout: null });

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.syncing).toBe(false);
  });

  it("should use default cards when localStorage contains invalid data", () => {
    mockGetItem.mockReturnValue("not valid json");
    vi.mocked(useQuery).mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.cards).toEqual(DEFAULT_CARDS);
  });

  it("should use default cards when localStorage has wrong length array", () => {
    mockGetItem.mockReturnValue(JSON.stringify([{ id: "consumption-stats", visible: true }]));
    vi.mocked(useQuery).mockReturnValue(null);

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.cards).toEqual(DEFAULT_CARDS);
  });

  it("should not sync to server if local editing was done first", () => {
    const serverLayout = [
      { id: "consumption-stats", visible: false },
      { id: "dashboard-stats", visible: true },
      { id: "tier-progress", visible: true },
      { id: "monthly-stats", visible: true },
      { id: "yearly-chart", visible: true },
      { id: "daily-chart", visible: true },
      { id: "frequency-chart", visible: true },
      { id: "cost-per-kwh-chart", visible: true },
    ];
    vi.mocked(useQuery).mockReturnValue({ dashboardLayout: serverLayout });

    // First render - should sync
    const { result, rerender } = renderHook(() => useDashboardLayout());
    expect(result.current.cards).toEqual(serverLayout);

    // Simulate local edit by calling setCards
    act(() => {
      result.current.setCards(DEFAULT_CARDS);
    });

    // Rerender with profile change - should not overwrite local changes
    const differentServerLayout: CardConfig[] = [
      { id: "consumption-stats", visible: true },
      { id: "dashboard-stats", visible: true },
      { id: "tier-progress", visible: true },
      { id: "monthly-stats", visible: true },
      { id: "yearly-chart", visible: true },
      { id: "daily-chart", visible: true },
      { id: "frequency-chart", visible: true },
      { id: "cost-per-kwh-chart", visible: true },
    ];
    vi.mocked(useQuery).mockReturnValue({ dashboardLayout: differentServerLayout });
    rerender();

    // Local edit should be preserved
    expect(result.current.cards).toEqual(DEFAULT_CARDS);
  });
});
