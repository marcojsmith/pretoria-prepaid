import { render, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterSW from "./RegisterSW";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

describe("RegisterSW", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<RegisterSW />);
    expect(container).toBeDefined();
  });

  it("shows toast when app is ready for offline", () => {
    (useRegisterSW as any).mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [true, vi.fn()],
      updateServiceWorker: vi.fn(),
    });

    render(<RegisterSW />);
    expect(toast).toHaveBeenCalledWith("App ready to work offline", expect.any(Object));
  });

  it("shows toast when new content is available", () => {
    (useRegisterSW as any).mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    });

    render(<RegisterSW />);
    expect(toast).toHaveBeenCalledWith(
      "New content available, click on reload button to update.",
      expect.any(Object)
    );
  });

  it("calls onRegistered", () => {
    let registeredCallback: any;
    (useRegisterSW as any).mockImplementation((options: any) => {
      registeredCallback = options.onRegistered;
      return {
        needRefresh: [false, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      };
    });

    render(<RegisterSW />);
    const consoleSpy = vi.spyOn(console, "log");
    act(() => {
      registeredCallback("test-registration");
    });
    expect(consoleSpy).toHaveBeenCalledWith("SW Registered: test-registration");
  });

  it("calls onRegisterError", () => {
    let errorCallback: any;
    (useRegisterSW as any).mockImplementation((options: any) => {
      errorCallback = options.onRegisterError;
      return {
        needRefresh: [false, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      };
    });

    render(<RegisterSW />);
    const consoleSpy = vi.spyOn(console, "error");
    act(() => {
      errorCallback("test-error");
    });
    expect(consoleSpy).toHaveBeenCalledWith("SW registration error", "test-error");
  });

  it("calls close function from offline ready toast action", async () => {
    const setOfflineReady = vi.fn();
    const setNeedRefresh = vi.fn();
    let toastAction: any;

    (useRegisterSW as any).mockReturnValue({
      needRefresh: [false, setNeedRefresh],
      offlineReady: [true, setOfflineReady],
      updateServiceWorker: vi.fn(),
    });

    (toast as any).mockImplementation((msg: string, options: any) => {
      if (options && options.action && msg === "App ready to work offline") {
        toastAction = options.action.onClick;
      }
    });

    render(<RegisterSW />);

    await waitFor(() => expect(toastAction).toBeDefined());

    act(() => {
      toastAction();
    });

    expect(setOfflineReady).toHaveBeenCalledWith(false);
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it("calls updateServiceWorker from refresh toast action", async () => {
    const updateServiceWorker = vi.fn();
    let toastAction: any;

    (useRegisterSW as any).mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });

    (toast as any).mockImplementation((msg: string, options: any) => {
      if (
        options &&
        options.action &&
        msg === "New content available, click on reload button to update."
      ) {
        toastAction = options.action.onClick;
      }
    });

    render(<RegisterSW />);

    await waitFor(() => expect(toastAction).toBeDefined());

    act(() => {
      toastAction();
    });

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
