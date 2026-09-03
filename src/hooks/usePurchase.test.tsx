import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePurchases } from "./usePurchase";
import * as convexReact from "convex/react";
import { useMeters } from "./useMeters";

interface QueueItem {
  type: string;
  purchaseId?: string;
  units?: number;
  meterId?: string;
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

vi.mock("./useMeters", () => ({
  useMeters: vi.fn(),
}));

const NO_ACTIVE_METER = {
  meters: [],
  activeMeter: undefined,
  loading: false,
  setActiveMeter: vi.fn(),
  addMeter: vi.fn(),
  updateMeter: vi.fn(),
  archiveMeter: vi.fn(),
} as unknown as ReturnType<typeof useMeters>;

function mockActiveMeter(meterId: string) {
  vi.mocked(useMeters).mockReturnValue({
    ...NO_ACTIVE_METER,
    activeMeter: { meterId, name: "Test Meter" } as unknown as ReturnType<
      typeof useMeters
    >["activeMeter"],
  });
}

describe("usePurchases Hook - Offline Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));
    mutationCallCount = 0;

    // Default online state
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    vi.mocked(useMeters).mockReturnValue(NO_ACTIVE_METER);
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

  it("loads cached data from localStorage safely", async () => {
    // Simulate network still loading so cached purchases are not overwritten
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);
    localStorage.setItem(
      "purchases_history",
      JSON.stringify([
        {
          _id: "cached-1",
          units: 10,
          date: "2024-01-15",
          amountPaid: 50,
          cost: 0,
          tierBreakdown: [],
        },
      ])
    );
    localStorage.setItem(
      "offline_purchases_queue",
      JSON.stringify([{ id: "q-1", type: "add", units: 5 }])
    );

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.purchases.length).toBeGreaterThan(0);
  });

  it("handles malformed cache data safely", () => {
    localStorage.setItem("purchases_history", "invalid-json");
    localStorage.setItem("offline_purchases_queue", "invalid-json");

    const { result } = renderHook(() => usePurchases());
    expect(result.current.purchases).toHaveLength(0);
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
});

describe("usePurchases Hook - Meter safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-25T10:00:00.000Z"));
    mutationCallCount = 0;
    vi.mocked(convexReact.useQuery).mockReturnValue([]);
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("captures the active meter id at queue time on an offline add", async () => {
    mockActiveMeter("meter-a");
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

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue:meter-a"));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.meterId).toBe("meter-a");
  });

  it("uses the per-meter cache key for confirmed purchases and the offline queue", async () => {
    mockActiveMeter("meter-b");
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 50,
        amountPaid: 150,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 250,
      });
    });

    expect(localStorage.getItem("offline_purchases_queue:meter-b")).not.toBeNull();
    // The un-suffixed legacy key must not be touched once a meter is known.
    expect(localStorage.getItem("offline_purchases_queue")).toBeNull();
  });

  it("passes the captured meterId (not the meter active at replay time) when syncing a queued add", async () => {
    // Queue an item while meter-a is active.
    mockActiveMeter("meter-a");
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result, rerender } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 20,
        amountPaid: 60,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 100,
      });
    });

    // Switch the active meter mid-queue, then come back online.
    mockActiveMeter("meter-b");
    mockAddPurchase.mockResolvedValue({ success: true });
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    rerender();

    await act(async () => {
      window.dispatchEvent(new Event("online"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockAddPurchase).toHaveBeenCalledWith(expect.objectContaining({ meterId: "meter-a" }));
  });

  it("does not change the target meter of an already-queued item when the active meter switches", async () => {
    mockActiveMeter("meter-a");
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const { result, rerender } = renderHook(() => usePurchases());

    await act(async () => {
      await result.current.addPurchase({
        units: 10,
        amountPaid: 30,
        date: "2024-02-25T10:00:00.000Z",
        meterReading: 40,
      });
    });

    mockActiveMeter("meter-b");
    rerender();

    const queue = parseQueue(localStorage.getItem("offline_purchases_queue:meter-a"));
    expect(queue).toHaveLength(1);
    expect(queue[0]!.meterId).toBe("meter-a");
  });
});
