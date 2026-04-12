import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareModal } from "./ShareModal";

vi.mock("@/hooks/useHousehold", () => ({
  useHousehold: () => ({
    createInvite: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ShareModal", () => {
  it("renders modal when open", () => {
    render(<ShareModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText("Invite Someone")).toBeInTheDocument();
    expect(screen.getByText("Generate Invite Link")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ShareModal open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText("Invite Someone")).not.toBeInTheDocument();
  });

  it("displays description about link validity", () => {
    render(<ShareModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText(/Valid for 7 days/)).toBeInTheDocument();
  });
});
