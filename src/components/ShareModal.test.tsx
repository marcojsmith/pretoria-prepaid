import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareModal } from "./ShareModal";

const mockCreateInvite = vi.fn();
const mockOnOpenChange = vi.fn();

vi.mock("@/hooks/useHousehold", () => ({
  useHousehold: () => ({
    createInvite: mockCreateInvite,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ShareModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInvite.mockReset();
  });

  it("renders modal when open", () => {
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText("Invite Someone")).toBeInTheDocument();
    expect(screen.getByText("Generate Invite Link")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ShareModal open={false} onOpenChange={mockOnOpenChange} />);

    expect(screen.queryByText("Invite Someone")).not.toBeInTheDocument();
  });

  it("displays description about link validity", () => {
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    expect(screen.getByText(/Valid for 7 days/)).toBeInTheDocument();
  });

  it("generates invite link when button clicked", async () => {
    mockCreateInvite.mockResolvedValue("test-code-123");
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    const generateButton = screen.getByText("Generate Invite Link");
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockCreateInvite).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/test-code-123/)).toBeInTheDocument();
    });
  });

  it("shows loading state while generating", () => {
    mockCreateInvite.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("code"), 100))
    );
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    expect(screen.getByText("Generating...")).toBeInTheDocument();
  });

  it("generates new link when 'Generate Another Link' is clicked", async () => {
    mockCreateInvite.mockResolvedValue("test-code-123");
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(screen.getByText(/test-code-123/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Generate Another Link"));
    expect(mockCreateInvite).toHaveBeenCalledTimes(2);
  });

  it("shows copy button when link is generated", async () => {
    mockCreateInvite.mockResolvedValue("test-code-123");
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(screen.getByText(/test-code-123/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("shows 'Generate Another Link' after generating", async () => {
    mockCreateInvite.mockResolvedValue("test-code-123");
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(screen.getByText("Generate Another Link")).toBeInTheDocument();
    });
  });

  it("displays expiration notice after generating", async () => {
    mockCreateInvite.mockResolvedValue("test-code-123");
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(screen.getByText(/expires in 7 days/)).toBeInTheDocument();
    });
  });

  it("handles generate error gracefully", async () => {
    const { toast } = await import("sonner");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
    mockCreateInvite.mockRejectedValue(new Error("Failed"));
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to generate invite link", expect.any(Error));
    });

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Failed to generate invite link");
    });

    consoleSpy.mockRestore();
  });

  it("copies invite url to clipboard when copy button clicked", async () => {
    mockCreateInvite.mockResolvedValue("copy-code-456");
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(screen.getByText(/copy-code-456/)).toBeInTheDocument();
    });

    // Find the copy button (small button next to the URL)
    const buttons = screen.getAllByRole("button");
    const copyBtn = buttons.find(
      (b) =>
        b !== screen.queryByText("Generate Another Link") && !b.textContent?.includes("Generate")
    );
    if (copyBtn) fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("copy-code-456"));
    });
  });

  it("has visible content when open with invite url", async () => {
    mockCreateInvite.mockResolvedValue("test-code-123");
    const onOpenChange = vi.fn();
    render(<ShareModal open={true} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));
    await waitFor(() => {
      expect(screen.getByText(/test-code-123/)).toBeInTheDocument();
    });
  });

  it("handleCopy shows error toast when clipboard fails", async () => {
    const { toast } = await import("sonner");
    mockCreateInvite.mockResolvedValue("err-code-789");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("Clipboard denied")) },
      configurable: true,
    });

    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(screen.getByText(/err-code-789/)).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const copyBtn = buttons.find((b) => !b.textContent?.includes("Generate"));
    if (copyBtn) fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Failed to copy link");
    });
  });
});
