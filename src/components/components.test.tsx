import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { NavLink } from "./NavLink";
import { DashboardStats } from "./DashboardStats";
import { TierProgress } from "./TierProgress";
import { useRates } from "../hooks/useRates";

vi.mock("../hooks/useRates");

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

describe("Application Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRates).mockReturnValue({
      rates: MOCK_RATES,
      loading: false,
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders NavLink", () => {
    render(
      <BrowserRouter>
        <NavLink to="/">Home</NavLink>
      </BrowserRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders DashboardStats and handles clicks", () => {
    const { getByText } = render(
      <BrowserRouter>
        <DashboardStats
          unitsThisMonth={100}
          costThisMonth={342}
          averageMonthlyUsage={300}
          dailyAverage={10}
          averageMonthlyCost={1000}
        />
      </BrowserRouter>
    );
    expect(getByText(/100 kWh/)).toBeInTheDocument();

    // Test action cards
    fireEvent.click(getByText(/Buy Units/i));
    fireEvent.click(getByText(/Log Purchase/i));
  });

  it("renders DashboardStats with monthlyBudget and progress bar", () => {
    const { getByText, getByRole, getAllByText } = render(
      <BrowserRouter>
        <DashboardStats
          unitsThisMonth={100}
          costThisMonth={342}
          averageMonthlyUsage={300}
          dailyAverage={10}
          averageMonthlyCost={1000}
          monthlyBudget={1000}
        />
      </BrowserRouter>
    );
    expect(getByText(/Monthly Budget/i)).toBeInTheDocument();
    expect(getAllByText(/1000.00/)[0]).toBeInTheDocument();
    expect(getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders TierProgress", () => {
    render(<TierProgress unitsBought={50} />);
    expect(screen.getByText(/Tier 1/)).toBeInTheDocument();
    expect(screen.getByText(/50 \/ 100 kWh/)).toBeInTheDocument();
  });
});
