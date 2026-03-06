import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast, toast, reducer, State, Action, ToasterToast } from "./use-toast";

describe("useToast hook and logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("adds a toast when toast() is called", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast", description: "This is a test" });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe("Test Toast");
  });

  it("updates a toast when update() is called", () => {
    const { result } = renderHook(() => useToast());
    let t: { id: string; dismiss: () => void; update: (props: ToasterToast) => void };

    act(() => {
      t = toast({ title: "Original Title" });
    });

    act(() => {
      t.update({ title: "Updated Title", id: t.id });
    });

    expect(result.current.toasts[0].title).toBe("Updated Title");
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

  it("dismisses all toasts when dismiss() is called without id", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Toast 1" });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts.every((t) => !t.open)).toBe(true);
  });

  it("handles onOpenChange accurately", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "OnOpenChange Test" });
    });

    const currentToast = result.current.toasts[0];

    act(() => {
      if (currentToast.onOpenChange) {
        currentToast.onOpenChange(false);
      }
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("reducer handles UPDATE_TOAST", () => {
    const initialState: State = { toasts: [{ id: "1", title: "Old" }] };
    const action: Action = {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "New" },
    };
    const nextState = reducer(initialState, action);
    expect(nextState.toasts[0].title).toBe("New");
  });

  it("reducer handles REMOVE_TOAST without id", () => {
    const initialState: State = {
      toasts: [
        { id: "1", title: "T1" },
        { id: "2", title: "T2" },
      ],
    };
    const action: Action = { type: "REMOVE_TOAST" };
    const nextState = reducer(initialState, action);
    expect(nextState.toasts.length).toBe(0);
  });

  it("reducer handles DISMISS_TOAST with id", () => {
    const initialState: State = { toasts: [{ id: "1", title: "T1", open: true }] };
    const action: Action = { type: "DISMISS_TOAST", toastId: "1" };
    const nextState = reducer(initialState, action);
    expect(nextState.toasts[0].open).toBe(false);
  });
});
