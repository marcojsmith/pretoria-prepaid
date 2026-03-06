import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProfile } from "./useProfile";
import { useQuery } from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() =>
    Object.assign(vi.fn(), {
      withOptimisticUpdate: vi.fn().mockReturnThis(),
    })
  ),
}));

describe("useProfile", () => {
  it("should return loading state when profile is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBeUndefined();
    expect(typeof result.current.updateProfile).toBe("function");
  });

  it("should return profile when loaded", () => {
    const mockProfile = { id: "1", name: "Test User" };
    vi.mocked(useQuery).mockReturnValue(mockProfile);

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(false);
    expect(result.current.profile).toEqual(mockProfile);
  });
});
