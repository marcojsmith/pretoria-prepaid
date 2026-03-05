import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HomePage from "./HomePage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@clerk/clerk-react", () => ({
  SignedIn: ({ children }: any) => <>{children}</>,
  SignedOut: ({ children }: any) => <>{children}</>,
  useAuth: () => ({ isSignedIn: true }),
}));

describe("HomePage", () => {
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
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    const loginButton = screen.getAllByText(/Login/i)[0];
    loginButton.click();
    // Verification of navigation would require mocking useNavigate
  });
});
