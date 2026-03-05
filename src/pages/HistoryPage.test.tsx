import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HistoryPage from "./HistoryPage";
import { usePurchases } from "../hooks/usePurchase";
import { useAuth } from "../hooks/useAuth";

vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useAuth");

describe("HistoryPage", () => {
  beforeEach(() => {
    (useAuth as any).mockReturnValue({
      user: { id: "1", primaryEmailAddress: { emailAddress: "test@example.com" } },
      loading: false,
      signOut: vi.fn(),
    });
  });

  it("renders correctly", () => {
    const getCurrentMonthPurchases = vi.fn(() => []);
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getCurrentMonthPurchases,
      getAverageMonthlyUsage: () => 300,
      addPurchase: vi.fn(),
      deletePurchase: vi.fn(),
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/Purchase History/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PowerTracker/i).length).toBeGreaterThan(0);
    expect(getCurrentMonthPurchases).toHaveBeenCalled();
  });

  it("handles add purchase", async () => {
    const addPurchase = vi.fn();
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
      addPurchase,
      deletePurchase: vi.fn(),
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    // AddPurchaseForm should be present
    const amountInput = screen.getByPlaceholderText(/R 500\.00/i);
    fireEvent.change(amountInput, { target: { value: "100" } });

    const unitsInput = screen.getByPlaceholderText(/e\.g\. 120\.5/i);
    fireEvent.change(unitsInput, { target: { value: "30" } });

    const submitButton = screen.getByText(/Add Purchase/i);
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(addPurchase).toHaveBeenCalled();
  });

  it("handles logout click", async () => {
    const signOut = vi.fn();
    (useAuth as any).mockReturnValue({ user: { id: "1" }, loading: false, signOut });
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
      addPurchase: vi.fn(),
      deletePurchase: vi.fn(),
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    const logoutButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-log-out"));
    await act(async () => {
      fireEvent.click(logoutButton!);
    });

    expect(signOut).toHaveBeenCalled();
  });
});
