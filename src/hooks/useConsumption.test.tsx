import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConsumption } from "./useConsumption";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useConsumption hook", () => {
  const mockAddReading = vi.fn();
  const mockDeleteReading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    let mutationCallCount = 0;
    (useMutation as unknown as { mockImplementation: (cb: () => void) => void }).mockImplementation(
      () => {
        mutationCallCount++;
        if (mutationCallCount === 1) return mockAddReading;
        if (mutationCallCount === 2) return mockDeleteReading;
        return vi.fn();
      }
    );
  });

  it("returns loading state correctly", () => {
    (useQuery as unknown as { mockReturnValue: (val: unknown) => void }).mockReturnValue(undefined);
    const { result } = renderHook(() => useConsumption());
    expect(result.current.loading).toBe(true);
  });

  it("returns readings and stats when loaded", () => {
    const mockReadings = [{ _id: "1", reading: 100, date: "2024-03-01" }];
    const mockStats = { dailyAverage: 5 };

    let queryCallCount = 0;
    (useQuery as unknown as { mockImplementation: (cb: () => void) => void }).mockImplementation(
      () => {
        queryCallCount++;
        if (queryCallCount === 1) return mockReadings;
        if (queryCallCount === 2) return mockStats;
        return undefined;
      }
    );

    const { result } = renderHook(() => useConsumption());
    expect(result.current.loading).toBe(false);
    expect(result.current.readings).toEqual(mockReadings);
    expect(result.current.stats).toEqual(mockStats);
  });

  it("handles addReading successfully", async () => {
    mockAddReading.mockResolvedValue({});
    const { result } = renderHook(() => useConsumption());

    await act(async () => {
      await result.current.addReading(120, "2024-03-02");
    });

    expect(mockAddReading).toHaveBeenCalledWith({ reading: 120, date: "2024-03-02" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("handles addReading failure", async () => {
    mockAddReading.mockRejectedValue(new Error("Failed"));
    const { result } = renderHook(() => useConsumption());

    await act(async () => {
      await result.current.addReading(120, "2024-03-02");
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it("handles deleteReading successfully", async () => {
    mockDeleteReading.mockResolvedValue({});
    const { result } = renderHook(() => useConsumption());

    await act(async () => {
      await result.current.deleteReading("id-1" as Id<"meter_readings">);
    });

    expect(mockDeleteReading).toHaveBeenCalledWith({ id: "id-1" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("handles deleteReading failure", async () => {
    mockDeleteReading.mockRejectedValue(new Error("Failed"));
    const { result } = renderHook(() => useConsumption());

    await act(async () => {
      await result.current.deleteReading("id-1" as Id<"meter_readings">);
    });

    expect(toast.error).toHaveBeenCalled();
  });
});
