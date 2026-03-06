import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ConnectionStatus } from "./ConnectionStatus";

describe("ConnectionStatus", () => {
  beforeEach(() => {
    // Reset navigator.onLine mock before each test
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  it("returns null when online and offlineCount is 0", () => {
    const { container } = render(<ConnectionStatus offlineCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders syncing badge when online and offlineCount > 0", () => {
    render(<ConnectionStatus offlineCount={3} />);

    const badge = screen.getByText(/Syncing 3 items.../i);
    expect(badge).toBeInTheDocument();
  });

  it("renders offline mode badge when navigator is offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    render(<ConnectionStatus offlineCount={0} />);

    expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();
  });

  it("updates state on online/offline events", () => {
    render(<ConnectionStatus offlineCount={0} />);

    // Initially online (no badge)
    expect(screen.queryByText(/Offline Mode/i)).not.toBeInTheDocument();

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByText(/Offline Mode/i)).toBeInTheDocument();

    // Trigger online event
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByText(/Offline Mode/i)).not.toBeInTheDocument();
  });
});
