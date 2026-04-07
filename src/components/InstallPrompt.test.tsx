import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { InstallPrompt } from "./InstallPrompt";

// Mock framer-motion to avoid animation delays
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("InstallPrompt", () => {
  const originalUserAgent = window.navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Reset User Agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not render if already in standalone mode", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
      })),
    });

    render(<InstallPrompt />);
    expect(screen.queryByText(/Install Pretoria Prepaid/i)).not.toBeInTheDocument();
  });

  it("should show prompt when beforeinstallprompt event is fired", () => {
    render(<InstallPrompt />);

    const event = new Event("beforeinstallprompt") as any;
    event.preventDefault = vi.fn();

    act(() => {
      window.dispatchEvent(event);
    });

    expect(screen.getByText(/Install Pretoria Prepaid/i)).toBeInTheDocument();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("should handle installation process", async () => {
    render(<InstallPrompt />);

    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt") as any;
    event.prompt = promptSpy;
    event.userChoice = Promise.resolve({ outcome: "accepted" });

    act(() => {
      window.dispatchEvent(event);
    });

    const installButton = screen.getByText(/Install Now/i);
    await act(async () => {
      fireEvent.click(installButton);
    });

    expect(promptSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText(/Install Now/i)).not.toBeInTheDocument();
    });
  });

  it("should show iOS specific instructions", async () => {
    vi.useFakeTimers();
    // Mock iOS User Agent
    Object.defineProperty(window.navigator, "userAgent", {
      value: "iPhone",
      configurable: true,
    });

    render(<InstallPrompt />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/Tap/i)).toBeInTheDocument();
    expect(screen.getByText(/then "Add to Home Screen"/i)).toBeInTheDocument();
  });

  it("should dismiss prompt and save to localStorage", async () => {
    render(<InstallPrompt />);

    const event = new Event("beforeinstallprompt") as any;
    act(() => {
      window.dispatchEvent(event);
    });

    const dismissButton = screen.getByLabelText(/Dismiss install prompt/i);
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/Install Pretoria Prepaid/i)).not.toBeInTheDocument();
    });
    expect(localStorage.getItem("pwa-prompt-dismissed")).toBeDefined();
  });

  it("should handle install errors gracefully", async () => {
    render(<InstallPrompt />);

    const event = new Event("beforeinstallprompt") as any;
    event.prompt = vi.fn().mockRejectedValue(new Error("Install failed"));
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    act(() => {
      window.dispatchEvent(event);
    });

    const installButton = screen.getByText(/Install Now/i);
    await act(async () => {
      fireEvent.click(installButton);
    });

    expect(consoleSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText(/Install Pretoria Prepaid/i)).not.toBeInTheDocument();
    });
    consoleSpy.mockRestore();
  });

  it("should handle dismissed user choice without error", async () => {
    render(<InstallPrompt />);

    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt") as any;
    event.prompt = promptSpy;
    event.userChoice = Promise.resolve({ outcome: "dismissed" });

    act(() => {
      window.dispatchEvent(event);
    });

    const installButton = screen.getByText(/Install Now/i);
    await act(async () => {
      fireEvent.click(installButton);
    });

    expect(promptSpy).toHaveBeenCalled();
    // Prompt hides immediately when install button is clicked
    await waitFor(() => {
      expect(screen.queryByText(/Install Pretoria Prepaid/i)).not.toBeInTheDocument();
    });
  });
});
