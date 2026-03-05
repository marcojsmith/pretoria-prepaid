import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HistoryPage from "./HistoryPage";
import { usePurchases } from "../hooks/usePurchase";
import { useAuth } from "../hooks/useAuth";
import * as convexReact from "convex/react";

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

vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useAuth");

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (convexReact.useQuery as any).mockReturnValue(MOCK_RATES);
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
