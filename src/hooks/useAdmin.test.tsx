import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAdmin } from "./useAdmin";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

describe("useAdmin Hook", () => {
  const mockMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMutation).mockReturnValue(
      mockMutation as unknown as ReturnType<typeof useMutation>
    );
  });

  it("returns loading true when queries are undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useAdmin());

    expect(result.current.loading).toBe(true);
  });

  it("returns data and loading false when queries are resolved", () => {
    vi.mocked(useQuery).mockImplementation(() => {
      // Use truthy values for all 4 queries to satisfy the loading check
      // if (!globalStats || !usersList || !recentPurchases || !rates)
      return { _id: "mock-data" };
    });

    const { result } = renderHook(() => useAdmin());

    expect(result.current.loading).toBe(false);
    expect(result.current.globalStats).toBeDefined();
    expect(result.current.usersList).toBeDefined();
  });

  it("calls updateRate mutation correctly", async () => {
    vi.mocked(useQuery).mockReturnValue({});

    const { result } = renderHook(() => useAdmin());

    const params = {
      id: "r1" as Id<"electricity_rates">,
      tier_label: "Test",
      min_units: 0,
      max_units: 100,
      rate: 2.5,
    };

    await result.current.updateRate(params);

    expect(mockMutation).toHaveBeenCalledWith(params);
  });
});
