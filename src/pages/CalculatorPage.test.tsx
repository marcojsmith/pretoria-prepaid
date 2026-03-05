import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CalculatorPage from "./CalculatorPage";
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
vi.mock("../lib/electricity", async () => {
  const actual = (await vi.importActual("../lib/electricity")) as any;
  return {
    ...actual,
    getDaysLeftInMonth: () => 10,
  };
});

describe("CalculatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (convexReact.useQuery as any).mockReturnValue(MOCK_RATES);
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
