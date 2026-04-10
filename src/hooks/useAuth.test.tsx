import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { AuthProvider } from "../contexts/AuthContext";
import * as clerkReact from "@clerk/clerk-react";
import * as convexReact from "convex/react";
import { toast } from "sonner";

vi.mock("@clerk/clerk-react", () => ({
  useUser: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn()),
  useConvexAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when loaded", () => {
    vi.mocked(clerkReact.useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    } as unknown as ReturnType<typeof clerkReact.useUser>);
    vi.mocked(clerkReact.useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      signOut: vi.fn(),
      getToken: vi.fn(),
    } as unknown as ReturnType<typeof clerkReact.useAuth>);

    render(
      <AuthProvider>
        <div data-testid="child">Child</div>
      </AuthProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("syncs user when signed in", () => {
    const syncUserMock = Object.assign(
      vi.fn(() => Promise.resolve()),
      {
        withOptimisticUpdate: vi.fn().mockReturnThis(),
      }
    );
    vi.mocked(convexReact.useMutation).mockReturnValue(
      syncUserMock as unknown as ReturnType<typeof convexReact.useMutation>
    );
    vi.mocked(clerkReact.useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        primaryEmailAddress: { emailAddress: "test@example.com" },
        firstName: "Test",
      },
    } as unknown as ReturnType<typeof clerkReact.useUser>);

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    expect(syncUserMock).toHaveBeenCalledWith({
      email: "test@example.com",
      preferredName: "Test",
    });
  });

  it("shows error toast when syncUser fails", async () => {
    const syncUserMock = vi.fn(() => Promise.reject(new Error("sync failed")));
    vi.mocked(convexReact.useMutation).mockReturnValue(
      syncUserMock as unknown as ReturnType<typeof convexReact.useMutation>
    );
    vi.mocked(clerkReact.useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        primaryEmailAddress: { emailAddress: "test@example.com" },
        firstName: "Test",
      },
    } as unknown as ReturnType<typeof clerkReact.useUser>);

    render(
      <AuthProvider>
        <div>Content</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(syncUserMock).toHaveBeenCalled();
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Session sync failed. Some features may be unavailable."
    );
  });

  it("useAuth throws error when outside provider", () => {
    // Suppress console.error for this test as we expect an error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider"
    );

    consoleSpy.mockRestore();
  });

  it("useAuth returns context when used within AuthProvider", () => {
    const signOutMock = vi.fn();
    vi.mocked(clerkReact.useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    } as unknown as ReturnType<typeof clerkReact.useUser>);
    vi.mocked(clerkReact.useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      signOut: signOutMock,
      getToken: vi.fn(),
    } as unknown as ReturnType<typeof clerkReact.useAuth>);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.signOut).toBe(signOutMock);
  });

  it("useAuth returns user when signed in", () => {
    const signOutMock = vi.fn();
    const getTokenMock = vi.fn().mockResolvedValue("token");
    vi.mocked(convexReact.useMutation).mockReturnValue(
      vi.fn(() => Promise.resolve()) as unknown as ReturnType<typeof convexReact.useMutation>
    );
    vi.mocked(clerkReact.useUser).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_123",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        firstName: "Test",
        lastName: "User",
      },
    } as unknown as ReturnType<typeof clerkReact.useUser>);
    vi.mocked(clerkReact.useAuth).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
      sessionId: "session_456",
      signOut: signOutMock,
      getToken: getTokenMock,
    } as unknown as ReturnType<typeof clerkReact.useAuth>);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toEqual({
      id: "user_123",
      primaryEmailAddress: { emailAddress: "test@example.com" },
      firstName: "Test",
      lastName: "User",
    });
    expect(result.current.signOut).toBe(signOutMock);
  });
});
