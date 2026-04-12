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

  it("resets state when modal is closed", async () => {
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

    const copyButton =
      document.querySelector('button[aria-label="copy"]') || document.querySelector("button svg");
    expect(copyButton).toBeInTheDocument();
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
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
    mockCreateInvite.mockRejectedValue(new Error("Failed"));
    render(<ShareModal open={true} onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("Generate Invite Link"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to generate invite link", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});
