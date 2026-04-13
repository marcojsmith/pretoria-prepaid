import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Header } from "./Header";

const mockNavigate = vi.fn();
const mockSignOut = vi.fn();
const mockToast = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/settings" }),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      imageUrl: null,
      fullName: "Test User",
      firstName: "Test",
      primaryEmailAddress: { emailAddress: "test@example.com" },
    },
    signOut: mockSignOut,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/components/NavMenu", () => ({
  NavMenu: () => <div data-testid="nav-menu" />,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nav menu and theme toggle", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByTestId("nav-menu")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("shows Back to Dashboard button when not on main page", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it("shows user name in dropdown", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows user email in dropdown", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("navigates to settings when Profile Settings clicked", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText("Profile Settings"));
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("calls signOut and navigates to /auth on successful logout", async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText("Log out"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("shows error toast when signOut fails", async () => {
    mockSignOut.mockRejectedValue(new Error("Sign out failed"));
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText("Log out"));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
    });
  });
});
