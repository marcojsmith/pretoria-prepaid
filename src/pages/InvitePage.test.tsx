import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter, useLocation } from "react-router-dom";
import InvitePage from "./InvitePage";
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { useHousehold } from "../hooks/useHousehold";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useParams: vi.fn(() => ({ code: "test-code" })),
    useLocation: vi.fn(() => ({ pathname: "/invite/test" })),
  };
});

vi.mock("convex/react");

vi.mock("../hooks/useHousehold", () => ({
  useHousehold: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockInviteData = {
  valid: true,
  expired: false,
  used: false,
  revoked: false,
  householdName: "Test Household",
  adminName: "Admin User",
};

describe("InvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Invalid Invite", () => {
    it("shows invalid invite view when invite is null", () => {
      vi.mocked(useQuery).mockReturnValue(null);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText(/Invalid invite link/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Go Home/i })).toBeInTheDocument();
    });

    it("navigates to home when Go Home button is clicked", () => {
      vi.mocked(useQuery).mockReturnValue(null);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      fireEvent.click(screen.getByRole("button", { name: /Go Home/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Expired Invite", () => {
    it("shows expired view when invite.valid is false and expired is true", () => {
      vi.mocked(useQuery).mockReturnValue({
        ...mockInviteData,
        valid: false,
        expired: true,
      } as never);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText(/Invite expired/i)).toBeInTheDocument();
    });

    it("shows used view when invite.used is true", () => {
      vi.mocked(useQuery).mockReturnValue({ ...mockInviteData, valid: false, used: true } as never);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText(/Invite already used/i)).toBeInTheDocument();
    });

    it("shows revoked view when invite.revoked is true", () => {
      vi.mocked(useQuery).mockReturnValue({
        ...mockInviteData,
        valid: false,
        revoked: true,
      } as never);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText(/Invite revoked/i)).toBeInTheDocument();
    });
  });

  describe("Already In Household", () => {
    it("shows already in household view when authenticated and inHousehold", () => {
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: true,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText(/already in a household/i)).toBeInTheDocument();
    });

    it("shows View My Household button when already in household", () => {
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: true,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByRole("button", { name: /View My Household/i })).toBeInTheDocument();
    });

    it("navigates to household when View My Household is clicked", () => {
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: true,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      fireEvent.click(screen.getByRole("button", { name: /View My Household/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/household");
    });
  });

  describe("Valid Invite", () => {
    it("shows household name for a valid invite", () => {
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText("Test Household")).toBeInTheDocument();
    });

    it("shows admin name", () => {
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByText(/Invited by Admin User/i)).toBeInTheDocument();
    });
  });

  describe("Authentication States", () => {
    it("shows Sign up to Join button when not authenticated", () => {
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByRole("button", { name: /Sign up to Join/i })).toBeInTheDocument();
    });

    it("shows Join button when authenticated", () => {
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
      });
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      expect(screen.getByRole("button", { name: /Join Test Household/i })).toBeInTheDocument();
    });

    it("navigates to auth when Sign up to Join is clicked", () => {
      vi.mocked(useConvexAuth).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
      });
      vi.mocked(useLocation).mockReturnValue({ pathname: "/invite/abc" } as never);
      vi.mocked(useQuery).mockReturnValue(mockInviteData as never);
      vi.mocked(useHousehold).mockReturnValue({
        joinHousehold: vi.fn(),
        inHousehold: false,
        loading: false,
      } as unknown as ReturnType<typeof useHousehold>);

      render(
        <BrowserRouter>
          <InvitePage />
        </BrowserRouter>
      );
      fireEvent.click(screen.getByRole("button", { name: /Sign up to Join/i }));
      expect(mockNavigate).toHaveBeenCalledWith("/auth?redirect=%2Finvite%2Fabc");
    });
  });
});
