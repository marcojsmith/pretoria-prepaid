import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HomePage from "./HomePage";
import * as convexReact from "convex/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// ... rest of the mocks ...

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

const MOCK_RATES = [
  { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.42585 },
  { _id: "2", tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.00936 },
  { _id: "3", tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.36816 },
  {
    _id: "4",
    tier_number: 4,
    tier_label: "Tier 4",
    min_units: 651,
    max_units: null,
    rate: 4.70902,
  },
];

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, signOut: vi.fn() })),
}));

vi.mock("@clerk/clerk-react", () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isSignedIn: true }),
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useQuery).mockReturnValue(MOCK_RATES);
  });

  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/PowerTracker/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Track Your Prepaid Electricity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Login/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Get Started/i).length).toBeGreaterThan(0);
  });

  it("handles login click", () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const loginButton = screen.getAllByText(/Login/i)[0];
    loginButton.click();
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it("redirects to dashboard when authenticated", () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1" } as any,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});
