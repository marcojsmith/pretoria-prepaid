import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRates } from "./useRates";
import { useQuery, useMutation } from "convex/react";

// Mock convex/react
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() =>
    Object.assign(vi.fn(), {
      withOptimisticUpdate: vi.fn().mockReturnThis(),
    })
  ),
}));

describe("useRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useMutation).mockReturnValue(
      Object.assign(vi.fn(), {
        withOptimisticUpdate: vi.fn().mockReturnThis(),
      }) as unknown as ReturnType<typeof useMutation>
    );
  });

  it("returns rates from convex when online", () => {
    const mockRates = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.5 },
    ];
    vi.mocked(useQuery).mockReturnValue(mockRates);

    const { result } = renderHook(() => useRates());

    expect(result.current.rates).toHaveLength(1);
    expect(result.current.rates[0].rate).toBe(3.5);
    expect(result.current.loading).toBe(false);
  });

  it("caches rates to localStorage when fetched from convex", () => {
    const mockRates = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.5 },
    ];
    vi.mocked(useQuery).mockReturnValue(mockRates);

    renderHook(() => useRates());

    const cached = JSON.parse(localStorage.getItem("electricity_rates") || "[]");
    expect(cached).toHaveLength(1);
    expect(cached[0].rate).toBe(3.5);
  });

  it("returns cached rates from localStorage when convex returns undefined (offline/loading)", () => {
    // Pre-populate cache
    const cachedRates = [
      { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 4.0 },
    ];
    localStorage.setItem("electricity_rates", JSON.stringify(cachedRates));

    // Simulate offline/loading (useQuery returns undefined)
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useRates());

    expect(result.current.rates).toHaveLength(1);
    expect(result.current.rates[0].rate).toBe(4.0);
  });

  it("handles malformed cache data safely", () => {
    localStorage.setItem("electricity_rates", "invalid-json");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useRates());

    expect(consoleSpy).toHaveBeenCalledWith("Failed to parse cached rates", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("handles updateRate success", async () => {
    const mockUpdateMutation = Object.assign(vi.fn().mockResolvedValue(null), {
      withOptimisticUpdate: vi.fn().mockReturnThis(),
    });
    vi.mocked(useMutation).mockReturnValue(mockUpdateMutation);

    const { result } = renderHook(() => useRates());
    const response = await result.current.updateRate("1", 4.5);

    expect(mockUpdateMutation).toHaveBeenCalledWith({ id: "1", rate: 4.5 });
    expect(response).toEqual({ error: null });
  });

  it("handles updateRate failure", async () => {
    const mockUpdateMutation = Object.assign(
      vi.fn().mockRejectedValue(new Error("Update failed")),
      {
        withOptimisticUpdate: vi.fn().mockReturnThis(),
      }
    );
    vi.mocked(useMutation).mockReturnValue(mockUpdateMutation);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useRates());
    const response = await result.current.updateRate("1", 4.5);

    expect(response.error).toBeInstanceOf(Error);
    expect(response.error?.message).toBe("Update failed");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("has a no-op refetch function", () => {
    const { result } = renderHook(() => useRates());
    expect(typeof result.current.refetch).toBe("function");
    act(() => {
      result.current.refetch();
    });
  });
});
