import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConsumption } from "./useConsumption";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";

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
  const mockAddOnboardingReading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useMutation as unknown as { mockImplementation: (cb: () => void) => void }).mockImplementation(
      () => mockAddOnboardingReading
    );
  });

  it("returns loading state correctly", () => {
    (useQuery as unknown as { mockReturnValue: (val: unknown) => void }).mockReturnValue(undefined);
    const { result } = renderHook(() => useConsumption());
    expect(result.current.loading).toBe(true);
  });

  it("returns readings and stats when loaded", () => {
    const mockReadings = [
      { _id: "1", readingPre: 100, readingPost: 150, date: "2024-03-01", source: "purchase" },
    ];
    const mockStats = { dailyAverage: 5 };

    let queryCallCount = 0;
    (useQuery as unknown as { mockImplementation: (cb: () => void) => void }).mockImplementation(
      () => {
        queryCallCount++;
        if (queryCallCount === 1) return mockReadings;
        if (queryCallCount === 2) return mockStats;
        if (queryCallCount === 3) return false;
        if (queryCallCount === 4) return false;
        return undefined;
      }
    );

    const { result } = renderHook(() => useConsumption());
    expect(result.current.loading).toBe(false);
    expect(result.current.readings).toEqual(mockReadings);
    expect(result.current.stats).toEqual(mockStats);
  });

  it("handles addOnboardingReading successfully", async () => {
    mockAddOnboardingReading.mockResolvedValue({});
    const { result } = renderHook(() => useConsumption());

    await act(async () => {
      await result.current.addOnboardingReading(120, 10);
    });

    expect(mockAddOnboardingReading).toHaveBeenCalledWith({ reading: 120, defaultDailyUsage: 10 });
    expect(toast.success).toHaveBeenCalled();
  });

  it("handles addOnboardingReading failure", async () => {
    mockAddOnboardingReading.mockRejectedValue(new Error("Failed"));
    const { result } = renderHook(() => useConsumption());

    await act(async () => {
      await result.current.addOnboardingReading(120);
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it("returns hasAnyReadings and hasPurchaseReadings", () => {
    let queryCallCount = 0;
    (useQuery as unknown as { mockImplementation: (cb: () => void) => void }).mockImplementation(
      () => {
        queryCallCount++;
        if (queryCallCount === 1) return [];
        if (queryCallCount === 2) return null;
        if (queryCallCount === 3) return true;
        if (queryCallCount === 4) return false;
        return undefined;
      }
    );

    const { result } = renderHook(() => useConsumption());
    expect(result.current.hasAnyReadings).toBe(true);
    expect(result.current.hasPurchaseReadings).toBe(false);
  });
});
