import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CalculatorPage from "./CalculatorPage";
import { usePurchases } from "../hooks/usePurchase";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useAuth");
vi.mock("../lib/electricity", async () => {
  const actual = (await vi.importActual("../lib/electricity")) as any;
  return {
    ...actual,
    getDaysLeftInMonth: () => 10,
  };
});

describe("CalculatorPage", () => {
  beforeEach(() => {
    (useAuth as any).mockReturnValue({ user: { id: "1" }, loading: false, signOut: vi.fn() });
  });

  it("renders correctly", () => {
    const getCurrentMonthPurchases = vi.fn(() => []);
    const getAverageMonthlyUsage = vi.fn(() => 300);

    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getCurrentMonthPurchases,
      getAverageMonthlyUsage,
    });

    render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Smart Calculator/i)).toBeInTheDocument();
    expect(screen.getByText(/10 days left/i)).toBeInTheDocument();
    expect(getCurrentMonthPurchases).toHaveBeenCalled();
    expect(getAverageMonthlyUsage).toHaveBeenCalled();
  });

  it("handles logout click", async () => {
    const signOut = vi.fn();
    (useAuth as any).mockReturnValue({ user: { id: "1" }, loading: false, signOut });
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
    });

    render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );

    const logoutButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-log-out"));
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton!);
    });

    expect(signOut).toHaveBeenCalled();
  });
});
