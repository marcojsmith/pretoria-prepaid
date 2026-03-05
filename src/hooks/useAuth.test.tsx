import { describe, it, expect, vi } from "vitest";
import { render, screen, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth } from "./useAuth";
import * as clerkReact from "@clerk/clerk-react";
import * as convexReact from "convex/react";

vi.mock("@clerk/clerk-react", () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useConvexAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

describe("AuthProvider", () => {
  it("renders children when loaded", () => {
    (clerkReact.useUser as any).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    (clerkReact.useAuth as any).mockReturnValue({
      signOut: vi.fn(),
    });

    render(
      <AuthProvider>
        <div data-testid="child">Child</div>
      </AuthProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("syncs user when signed in", () => {
    const syncUserMock = vi.fn();
    (convexReact.useMutation as any).mockReturnValue(syncUserMock);
    (clerkReact.useUser as any).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { primaryEmailAddress: { emailAddress: "test@example.com" } },
    });

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    expect(syncUserMock).toHaveBeenCalledWith({ email: "test@example.com" });
  });

  it("useAuth throws error when outside provider", () => {
    // Suppress console.error for this test as we expect an error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    consoleSpy.mockRestore();
  });
});
