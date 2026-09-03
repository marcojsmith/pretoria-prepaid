import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMeters } from "./useMeters";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

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

const mockMeters = [
  {
    meterId: "m1" as Id<"meters">,
    householdId: "h1" as Id<"households">,
    householdName: "Home",
    name: "Main",
    isActive: true,
    myRole: "admin" as const,
  },
  {
    meterId: "m2" as Id<"meters">,
    householdId: "h1" as Id<"households">,
    householdName: "Home",
    name: "Cottage",
    isActive: false,
    myRole: "admin" as const,
  },
];

describe("useMeters", () => {
  const mockSetActiveMeter = vi.fn();
  const mockAddMeter = vi.fn();
  const mockUpdateMeter = vi.fn();
  const mockArchiveMeter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    let call = 0;
    vi.mocked(useMutation).mockImplementation(() => {
      call++;
      const fns = [mockSetActiveMeter, mockAddMeter, mockUpdateMeter, mockArchiveMeter];
      return (fns[(call - 1) % fns.length] ?? vi.fn()) as unknown as ReturnType<typeof useMutation>;
    });
  });

  it("returns loading=true when meters is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    const { result } = renderHook(() => useMeters());

    expect(result.current.loading).toBe(true);
    expect(result.current.meters).toBeUndefined();
    expect(result.current.activeMeter).toBeUndefined();
  });

  it("returns the meter list and derives the active meter", () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    const { result } = renderHook(() => useMeters());

    expect(result.current.loading).toBe(false);
    expect(result.current.meters).toEqual(mockMeters);
    expect(result.current.activeMeter?.meterId).toBe("m1");
  });

  it("setActiveMeter calls the mutation and toasts success", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockSetActiveMeter.mockResolvedValue(null);
    const { result } = renderHook(() => useMeters());

    await act(async () => {
      await result.current.setActiveMeter("m2" as Id<"meters">);
    });

    expect(mockSetActiveMeter).toHaveBeenCalledWith({ meterId: "m2" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("setActiveMeter toasts an error and rethrows on failure", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockSetActiveMeter.mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.setActiveMeter("m2" as Id<"meters">);
      })
    ).rejects.toThrow("Unauthorized");

    expect(toast.error).toHaveBeenCalledWith("Unauthorized");
  });

  it("setActiveMeter falls back to a generic message when the error isn't an Error instance", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockSetActiveMeter.mockRejectedValue("not an error object");
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.setActiveMeter("m2" as Id<"meters">);
      })
    ).rejects.toBe("not an error object");

    expect(toast.error).toHaveBeenCalledWith("Failed to switch meter");
  });

  it("addMeter calls the mutation with the given args and toasts success", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockAddMeter.mockResolvedValue("newMeterId");
    const { result } = renderHook(() => useMeters());

    await act(async () => {
      await result.current.addMeter({ householdId: "h1" as Id<"households">, name: "New Meter" });
    });

    expect(mockAddMeter).toHaveBeenCalledWith({
      householdId: "h1",
      name: "New Meter",
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("addMeter toasts an error and rethrows on failure", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockAddMeter.mockRejectedValue(new Error("Meter name cannot be empty"));
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.addMeter({ householdId: "h1" as Id<"households">, name: "" });
      })
    ).rejects.toThrow("Meter name cannot be empty");

    expect(toast.error).toHaveBeenCalledWith("Meter name cannot be empty");
  });

  it("addMeter falls back to a generic message when the error isn't an Error instance", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockAddMeter.mockRejectedValue("not an error object");
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.addMeter({ householdId: "h1" as Id<"households">, name: "New" });
      })
    ).rejects.toBe("not an error object");

    expect(toast.error).toHaveBeenCalledWith("Failed to add meter");
  });

  it("updateMeter calls the mutation and toasts success", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockUpdateMeter.mockResolvedValue(null);
    const { result } = renderHook(() => useMeters());

    await act(async () => {
      await result.current.updateMeter({ meterId: "m1" as Id<"meters">, name: "Renamed" });
    });

    expect(mockUpdateMeter).toHaveBeenCalledWith({ meterId: "m1", name: "Renamed" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("updateMeter toasts an error and rethrows on failure", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockUpdateMeter.mockRejectedValue(new Error("Not a household admin"));
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.updateMeter({ meterId: "m1" as Id<"meters">, name: "Renamed" });
      })
    ).rejects.toThrow("Not a household admin");

    expect(toast.error).toHaveBeenCalledWith("Not a household admin");
  });

  it("updateMeter falls back to a generic message when the error isn't an Error instance", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockUpdateMeter.mockRejectedValue("not an error object");
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.updateMeter({ meterId: "m1" as Id<"meters">, name: "Renamed" });
      })
    ).rejects.toBe("not an error object");

    expect(toast.error).toHaveBeenCalledWith("Failed to update meter");
  });

  it("archiveMeter calls the mutation and toasts success", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockArchiveMeter.mockResolvedValue(null);
    const { result } = renderHook(() => useMeters());

    await act(async () => {
      await result.current.archiveMeter("m2" as Id<"meters">);
    });

    expect(mockArchiveMeter).toHaveBeenCalledWith({ meterId: "m2" });
    expect(toast.success).toHaveBeenCalled();
  });

  it("archiveMeter toasts an error and rethrows on failure", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockArchiveMeter.mockRejectedValue(new Error("Meter not found"));
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.archiveMeter("m2" as Id<"meters">);
      })
    ).rejects.toThrow("Meter not found");

    expect(toast.error).toHaveBeenCalledWith("Meter not found");
  });

  it("archiveMeter falls back to a generic message when the error isn't an Error instance", async () => {
    vi.mocked(useQuery).mockReturnValue(mockMeters);
    mockArchiveMeter.mockRejectedValue("not an error object");
    const { result } = renderHook(() => useMeters());

    await expect(
      act(async () => {
        await result.current.archiveMeter("m2" as Id<"meters">);
      })
    ).rejects.toBe("not an error object");

    expect(toast.error).toHaveBeenCalledWith("Failed to archive meter");
  });
});
