import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRates } from "./useRates";
import { useUserRole } from "./useUserRole";
import * as convexReact from "convex/react";
import { Id } from "../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

describe("Data Hooks", () => {
  it("useRates returns formatted rates", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([
      { _id: "1", tier_number: 1, tier_label: "T1", min_units: 0, max_units: 100, rate: 1.5 },
    ]);
    const { result } = renderHook(() => useRates());
    expect(result.current.rates[0].tier_label).toBe("T1");
    expect(result.current.loading).toBe(false);
  });

  it("useRates updateRate calls mutation", async () => {
    const updateMock = Object.assign(vi.fn().mockResolvedValue(null), {
      withOptimisticUpdate: vi.fn().mockReturnThis(),
    });
    vi.mocked(convexReact.useMutation).mockReturnValue(updateMock);

    const { result } = renderHook(() => useRates());
    await result.current.updateRate("1" as Id<"electricity_rates">, 2.0);

    expect(updateMock).toHaveBeenCalledWith({ id: "1", rate: 2.0 });
  });

  it("useUserRole identifies admin", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue("admin");
    const { result } = renderHook(() => useUserRole());
    expect(result.current.isAdmin).toBe(true);
  });
});
