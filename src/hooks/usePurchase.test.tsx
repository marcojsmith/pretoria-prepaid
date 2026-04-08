import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePurchases } from "./usePurchase";
import * as convexReact from "convex/react";
import { toast } from "sonner";

interface QueueItem {
  type: string;
  purchaseId?: string;
  units?: number;
}

function parseQueue(raw: string | null): QueueItem[] {
  return JSON.parse(raw ?? "[]") as QueueItem[];
}

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues addition when offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 100,
        amountPaid: 300,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 500,
      });
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.type).toBe("add");
    expect((result.current.purchases[0] as { isOffline: boolean }).isOffline).toBe(true);
  });

  it("queues addition when online but mutation fails", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mockAddPurchase.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 100,
        amountPaid: 300,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 500,
      });
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.type).toBe("add");
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
    vi.mocked(convexReact.useQuery).mockReturnValue(mockPurchases);

    const { result } = renderHook(() => usePurchases());
    expect(result.current.purchases).toHaveLength(1);

    // 2. Go offline and delete
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    await act(async () => {
      await result.current.deletePurchase("confirmed-1");
    });

    // 3. Verify queued and hidden from UI
    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.type).toBe("delete");
    expect(queue[0]!.purchaseId).toBe("confirmed-1");

    expect(result.current.purchases).toHaveLength(0);
  });

  it("queues deletion when online but mutation fails", async () => {
    const mockPurchases = [
      { _id: "confirmed-1", date: "2024-02-01", units: 50, amountPaid: 150, tierBreakdown: [] },
    ];
    vi.mocked(convexReact.useQuery).mockReturnValue(mockPurchases);

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mockDeletePurchase.mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.deletePurchase("confirmed-1");
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.type).toBe("delete");
  });

  it("removes an offline pending addition when deleted", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 100,
        amountPaid: 300,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 500,
      });
    });

    const pendingId = (result.current.purchases[0] as { _id: string })._id;

    await act(async () => {
      await result.current.deletePurchase(pendingId);
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(0);
    expect(result.current.purchases).toHaveLength(0);
  });

  it.skip("syncs all queued actions when coming back online", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 100,
        amountPaid: 300,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 500,
      });
      await result.current.deletePurchase("confirmed-1");
    });

    expect(mockAddPurchase).not.toHaveBeenCalled();
    expect(mockDeletePurchase).not.toHaveBeenCalled();

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mockAddPurchase.mockResolvedValue({ success: true });
    mockDeletePurchase.mockResolvedValue({ success: true });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });

    expect(mockAddPurchase).toHaveBeenCalledTimes(1);
    expect(mockDeletePurchase).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("offline_purchases_queue")).toBe("[]");
  });

  it("handles sync failure properly by retaining queue", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 100,
        amountPaid: 300,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 500,
      });
    });

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mockAddPurchase.mockRejectedValue(new Error("Sync Failed"));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(1);
  });

  it("loads cached data from localStorage safely", () => {
    localStorage.setItem("purchases_history", JSON.stringify([{ _id: "cached-1", units: 10 }]));
    localStorage.setItem(
      "offline_purchases_queue",
      JSON.stringify([{ id: "q-1", type: "add", units: 5 }])
    );

    const { result } = renderHook(() => usePurchases());
    expect(result.current.purchases.length).toBeGreaterThan(0);
  });

  it("handles malformed cache data safely", () => {
    localStorage.setItem("purchases_history", "invalid-json");
    localStorage.setItem("offline_purchases_queue", "invalid-json");

    const { result } = renderHook(() => usePurchases());
    expect(result.current.purchases).toHaveLength(0);
  });

  it("calculates monthly stats and averages correctly", () => {
    const mockPurchases = [
      { _id: "1", date: "2024-01-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
      { _id: "2", date: "2024-01-20", units: 200, amountPaid: 600, cost: 600, tierBreakdown: [] },
      { _id: "3", date: "2024-02-10", units: 150, amountPaid: 450, cost: 450, tierBreakdown: [] },
    ];
    vi.mocked(convexReact.useQuery).mockReturnValue(mockPurchases);
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z")); // Current month is Feb

    const { result } = renderHook(() => usePurchases());

    // Feb stats (current month)
    expect(result.current.unitsThisMonth).toBe(150);
    expect(result.current.costThisMonth).toBe(450);

    // Monthly stats
    const stats = result.current.getMonthlyStats();
    type MonthStat = { month: string; units: number; cost: number; purchases: number };
    expect(stats).toHaveLength(2);
    expect((stats[0] as MonthStat).month).toBe("2024-02");
    expect((stats[1] as MonthStat).month).toBe("2024-01");
    expect((stats[1] as MonthStat).units).toBe(300);

    // Averages (should use Jan stats as previous month: 300 units in Jan which has 31 days)
    expect(result.current.getAverageMonthlyUsage()).toBe(300);
    expect(result.current.getDailyAverageUsage()).toBeCloseTo(9.68, 2);
    expect(result.current.getAverageMonthlyCost()).toBe(900);
  });

  it("returns 0 for averages when no previous months exist", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([
      { _id: "1", date: "2024-02-15", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
    ]);
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));

    const { result } = renderHook(() => usePurchases());

    expect(result.current.getAverageMonthlyUsage()).toBe(0);
    expect(result.current.getDailyAverageUsage()).toBe(0);
    expect(result.current.getAverageMonthlyCost()).toBe(0);
  });

  it("returns loading=true when purchasesData is undefined and no cache", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
    localStorage.clear(); // ensure no cached data

    const { result } = renderHook(() => usePurchases());
    expect(result.current.loading).toBe(true);
  });

  it.skip("stops syncing mid-loop when navigator goes offline between iterations", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 100,
        amountPaid: 300,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 500,
      });
      await result.current.addPurchase({
        units: 50,
        amountPaid: 150,
        date: "2024-02-26T10:00:00.000Z",
        meterReading: 550,
      });
    });

    expect(result.current.purchases).toHaveLength(2);

    mockAddPurchase.mockImplementationOnce(() => {
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
      return Promise.resolve({ success: true });
    });

    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
    });

    expect(mockAddPurchase).toHaveBeenCalledTimes(1);
    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(1);
  });

  it("provides refill analysis correctly", () => {
    const mockPurchases = [
      { _id: "1", date: "2024-03-01", units: 100, amountPaid: 300, cost: 300, tierBreakdown: [] },
      { _id: "2", date: "2024-03-05", units: 50, amountPaid: 150, cost: 150, tierBreakdown: [] },
    ];
    vi.mocked(convexReact.useQuery).mockReturnValue(mockPurchases);

    const { result } = renderHook(() => usePurchases());
    const analysis = result.current.getRefillAnalysis();

    expect(analysis).toHaveLength(2);
    expect((analysis[1] as { daysSinceLastRefill: number | null }).daysSinceLastRefill).toBe(4);
  });
});

describe("usePurchases Hook - addBatchPurchases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));
    mutationCallCount = 0;

    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    mockAddPurchase.mockResolvedValue({ success: true });
    mockDeletePurchase.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("addBatchPurchases queues items when offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    const batchItems = [
      { units: 100, amountPaid: 300, date: "2024-02-25T10:00:00.000Z", meterReading: 500 },
      { units: 50, amountPaid: 150, date: "2024-02-26T10:00:00.000Z", meterReading: 550 },
    ];

    await act(async () => {
      await result.current.addBatchPurchases(batchItems);
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(2);
    expect(queue[0]!.type).toBe("add");
    expect(queue[0]!.units).toBe(100);
    expect(queue[1]!.units).toBe(50);
    expect(result.current.purchases).toHaveLength(2);
    expect((result.current.purchases[0] as { isOffline: boolean }).isOffline).toBe(true);
    expect((result.current.purchases[1] as { isOffline: boolean }).isOffline).toBe(true);
  });

  it("addBatchPurchases handles partial failures when online", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });

    mockAddPurchase.mockImplementation(() => {
      throw new Error("Network Error");
    });

    const { result } = renderHook(() => usePurchases());

    const batchItems = [
      { units: 100, amountPaid: 300, date: "2024-02-25T10:00:00.000Z", meterReading: 500 },
      { units: 50, amountPaid: 150, date: "2024-02-26T10:00:00.000Z", meterReading: 550 },
      { units: 75, amountPaid: 225, date: "2024-02-27T10:00:00.000Z", meterReading: 600 },
    ];

    await act(async () => {
      await result.current.addBatchPurchases(batchItems);
    });

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue"));
    expect(queue).toHaveLength(3);
  });

  it("addBatchPurchases shows success toast when all succeed", async () => {
    const { result } = renderHook(() => usePurchases());

    const batchItems = [
      { units: 100, amountPaid: 300, date: "2024-02-25T10:00:00.000Z", meterReading: 500 },
      { units: 50, amountPaid: 150, date: "2024-02-26T10:00:00.000Z", meterReading: 550 },
    ];

    await act(async () => {
      await result.current.addBatchPurchases(batchItems);
    });

    expect(toast.success).toHaveBeenCalledWith("Imported all 2 purchases.");
  });
});
