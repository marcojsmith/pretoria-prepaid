import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast, toast, reducer } from "./use-toast";

describe("useToast hook and logic", () => {
  it("adds a toast when toast() is called", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast", description: "This is a test" });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe("Test Toast");
  });

  it("dismisses a toast when dismiss() is called", () => {
    const { result } = renderHook(() => useToast());
    let id: string = "";

    act(() => {
      const t = toast({ title: "Dismiss Me" });
      id = t.id;
    });

    act(() => {
      result.current.dismiss(id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("reducer handles REMOVE_TOAST", () => {
    const initialState = { toasts: [{ id: "1", title: "Test" }] };
    const nextState = reducer(initialState as any, { type: "REMOVE_TOAST", toastId: "1" });
    expect(nextState.toasts.length).toBe(0);
  });
});
