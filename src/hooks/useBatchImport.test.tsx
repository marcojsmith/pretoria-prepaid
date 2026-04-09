import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBatchImport } from "./useBatchImport";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type QueuedPurchase =
  | {
      id: string;
      type: "add";
      units: number;
      amountPaid: number;
      date: string;
      meterReading: number;
    }
  | { id: string; type: "delete"; purchaseId: string };

const batchItems = [
  { units: 100, amountPaid: 300, date: "2024-02-25T10:00:00.000Z", meterReading: 500 },
  { units: 50, amountPaid: 150, date: "2024-02-26T10:00:00.000Z", meterReading: 550 },
];

describe("useBatchImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  it("queues all items when offline", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    const mockMutation = vi.fn().mockResolvedValue(undefined);
    const mockSaveQueue = vi.fn();

    const { result } = renderHook(() =>
      useBatchImport({
        addPurchaseMutation: mockMutation as never,
        offlineQueue: [],
        saveOfflineQueue: mockSaveQueue as never,
      })
    );

    await act(async () => {
      await result.current.addBatchPurchases(batchItems);
    });

    expect(mockMutation).not.toHaveBeenCalled();
    expect(mockSaveQueue).toHaveBeenCalledOnce();
    const [[queued]] = mockSaveQueue.mock.calls as [[QueuedPurchase[]]];
    expect(queued).toHaveLength(2);
    expect(queued[0]?.type).toBe("add");
    expect(toast.info).toHaveBeenCalled();
  });

  it("calls mutation for each item when online and shows success toast", async () => {
    const mockMutation = vi.fn().mockResolvedValue(undefined);
    const mockSaveQueue = vi.fn();

    const { result } = renderHook(() =>
      useBatchImport({
        addPurchaseMutation: mockMutation as never,
        offlineQueue: [],
        saveOfflineQueue: mockSaveQueue as never,
      })
    );

    await act(async () => {
      await result.current.addBatchPurchases(batchItems);
    });

    expect(mockMutation).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith("Imported all 2 purchases.");
  });

  it("queues failed items and shows retry toast on partial failure", async () => {
    const mockMutation = vi.fn().mockRejectedValue(new Error("Network Error"));
    const mockSaveQueue = vi.fn();

    const { result } = renderHook(() =>
      useBatchImport({
        addPurchaseMutation: mockMutation as never,
        offlineQueue: [],
        saveOfflineQueue: mockSaveQueue as never,
      })
    );

    await act(async () => {
      await result.current.addBatchPurchases(batchItems);
    });

    expect(mockSaveQueue).toHaveBeenCalledOnce();
    const [[queued]] = mockSaveQueue.mock.calls as [[QueuedPurchase[]]];
    expect(queued).toHaveLength(2);
    expect(toast.info).toHaveBeenCalledWith(
      "Imported purchases. Some items queued for retry.",
      expect.objectContaining({ description: expect.stringContaining("queued: 2") })
    );
  });
});
