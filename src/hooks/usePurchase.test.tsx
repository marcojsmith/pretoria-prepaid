import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePurchases } from "./usePurchase";
import * as convexReact from "convex/react";

const mockAddPurchase = vi.fn();
const mockDeletePurchase = vi.fn();

let mutationCallCount = 0;

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => {
    mutationCallCount++;
    // In our hook, addPurchase is initialized first, then deletePurchase
    if (mutationCallCount % 2 === 1) return mockAddPurchase;
    return mockDeletePurchase;
  }),
}));

describe("usePurchases Hook - Offline Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));
    mutationCallCount = 0;

    // Default online state
    (convexReact.useQuery as any).mockReturnValue([]);
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues addition when offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase(100, 300, "2024-02-25T10:00:00.000Z");
    });

    const queue = JSON.parse(localStorage.getItem("offline_purchases_queue") || "[]");
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("add");
    expect(result.current.purchases[0].isOffline).toBe(true);
  });

  it("queues deletion when offline", async () => {
    // 1. Start with some confirmed purchases
    const mockPurchases = [
      {
        _id: "confirmed-1",
        date: "2024-02-01T10:00:00Z",
        units: 50,
        amountPaid: 150,
        cost: 150,
        tierBreakdown: [],
      },
    ];
    (convexReact.useQuery as any).mockReturnValue(mockPurchases);

    const { result } = renderHook(() => usePurchases());
    expect(result.current.purchases).toHaveLength(1);

    // 2. Go offline and delete
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    await act(async () => {
      await result.current.deletePurchase("confirmed-1");
    });

    // 3. Verify queued and hidden from UI
    const queue = JSON.parse(localStorage.getItem("offline_purchases_queue") || "[]");
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("delete");
    expect(queue[0].purchaseId).toBe("confirmed-1");

    expect(result.current.purchases).toHaveLength(0);
  });

  it("syncs all queued actions when coming back online", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    // Queue an add and a delete
    await act(async () => {
      await result.current.addPurchase(100, 300, "2024-02-25T10:00:00.000Z");
      await result.current.deletePurchase("confirmed-1");
    });

    expect(mockAddPurchase).not.toHaveBeenCalled();
    expect(mockDeletePurchase).not.toHaveBeenCalled();

    // Simulate coming online
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mockAddPurchase.mockResolvedValue({ success: true });
    mockDeletePurchase.mockResolvedValue({ success: true });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(mockAddPurchase).toHaveBeenCalledTimes(1);
    expect(mockDeletePurchase).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("offline_purchases_queue")).toBe("[]");
  });
});
