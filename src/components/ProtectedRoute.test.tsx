import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
}));

describe("ProtectedRoute", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
  });

  it("renders children when authenticated and no admin required", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "123" }, loading: false });
    (useUserRole as ReturnType<typeof vi.fn>).mockReturnValue({ isAdmin: false, loading: false });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /auth when not authenticated", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, loading: false });
    (useUserRole as ReturnType<typeof vi.fn>).mockReturnValue({ isAdmin: false, loading: false });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/auth");
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when admin required and user is admin", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "123" }, loading: false });
    (useUserRole as ReturnType<typeof vi.fn>).mockReturnValue({ isAdmin: true, loading: false });

    render(
      <ProtectedRoute requireAdmin>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("redirects to /dashboard when admin required but user is not admin", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "123" }, loading: false });
    (useUserRole as ReturnType<typeof vi.fn>).mockReturnValue({ isAdmin: false, loading: false });

    render(
      <ProtectedRoute requireAdmin>
        <div>Admin Content</div>
      </ProtectedRoute>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("shows loading state when auth or role is loading", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null, loading: true });
    (useUserRole as ReturnType<typeof vi.fn>).mockReturnValue({ isAdmin: false, loading: false });

    const { container } = render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});