import { render, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RegisterSW from "./RegisterSW";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

// Mock virtual module
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn(),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

describe("RegisterSW", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    });
  });

  it("renders without crashing", () => {
    const { container } = render(<RegisterSW />);
    expect(container).toBeDefined();
  });

  it("shows toast when app is ready for offline", () => {
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [true, vi.fn()],
      updateServiceWorker: vi.fn(),
    });

    render(<RegisterSW />);
    expect(toast).toHaveBeenCalledWith("App ready to work offline", expect.any(Object));
  });

  it("shows toast when new content is available", () => {
    vi.mocked(useRegisterSW).mockReturnValue({
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
    let registeredCallback: ((registration: unknown) => void) | undefined;
    vi.mocked(useRegisterSW).mockImplementation((options) => {
      registeredCallback = options?.onRegistered as unknown as (reg: unknown) => void;
      return {
        needRefresh: [false, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      } as ReturnType<typeof useRegisterSW>;
    });

    render(<RegisterSW />);
    const consoleSpy = vi.spyOn(console, "log");
    act(() => {
      registeredCallback?.("test-registration");
    });
    expect(consoleSpy).toHaveBeenCalledWith("SW Registered: test-registration");
  });

  it("calls onRegisterError", () => {
    let errorCallback: ((error: unknown) => void) | undefined;
    vi.mocked(useRegisterSW).mockImplementation((options) => {
      errorCallback = options?.onRegisterError as unknown as (err: unknown) => void;
      return {
        needRefresh: [false, vi.fn()],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      } as ReturnType<typeof useRegisterSW>;
    });

    render(<RegisterSW />);
    const consoleSpy = vi.spyOn(console, "error");
    act(() => {
      errorCallback?.("test-error");
    });
    expect(consoleSpy).toHaveBeenCalledWith("SW registration error", "test-error");
  });

  it("calls close function from offline ready toast action", async () => {
    const setOfflineReady = vi.fn();
    const setNeedRefresh = vi.fn();
    let toastAction: (() => void) | undefined;

    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [false, setNeedRefresh],
      offlineReady: [true, setOfflineReady],
      updateServiceWorker: vi.fn(),
    });

    const offlineReadyMock = (msg: string, options: unknown) => {
      const opt = options as { action?: { onClick: () => void } };
      if (opt?.action && msg === "App ready to work offline") {
        toastAction = opt.action.onClick;
      }
      return msg;
    };

    vi.mocked(toast).mockImplementation(offlineReadyMock as unknown as typeof toast);

    render(<RegisterSW />);

    await waitFor(() => expect(toastAction).toBeDefined());

    act(() => {
      toastAction?.();
    });

    expect(setOfflineReady).toHaveBeenCalledWith(false);
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it("calls updateServiceWorker from refresh toast action", async () => {
    const updateServiceWorker = vi.fn();
    let toastAction: (() => void) | undefined;

    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });

    const refreshMock = (msg: string, options: unknown) => {
      const opt = options as { action?: { onClick: () => void } };
      if (opt?.action && msg === "New content available, click on reload button to update.") {
        toastAction = opt.action.onClick;
      }
      return msg;
    };

    vi.mocked(toast).mockImplementation(refreshMock as unknown as typeof toast);

    render(<RegisterSW />);

    await waitFor(() => expect(toastAction).toBeDefined());

    act(() => {
      toastAction?.();
    });

    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
