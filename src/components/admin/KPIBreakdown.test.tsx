import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { KPIBreakdown } from "./KPIBreakdown";
import { useQuery } from "convex/react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

describe("KPIBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("should render no readings message when stats is null", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: null,
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText(/no meter readings found/i)).toBeInTheDocument();
  });

  it("should render estimated balance card with correct data", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: "2024-03-15",
        dailyBurnRate: 10.5,
        estimatedBalance: 150.5,
        daysRemaining: 14,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText("Estimated Balance")).toBeInTheDocument();
    expect(screen.getByText(/anchor — last reading/i)).toBeInTheDocument();
  });

  it("should render days remaining card", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: "2024-03-15",
        dailyBurnRate: 10.5,
        estimatedBalance: 150.5,
        daysRemaining: 14,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText("Days Remaining")).toBeInTheDocument();
  });

  it("should render usage statistics card", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: "2024-03-15",
        dailyBurnRate: 10.5,
        estimatedBalance: 150.5,
        daysRemaining: 14,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [],
      currentMonthPurchases: [
        { date: "2024-03-01", units: 50, amountPaid: 500 },
        { date: "2024-03-15", units: 75, amountPaid: 750 },
      ],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText("Usage Statistics")).toBeInTheDocument();
    expect(screen.getByText(/this month/i)).toBeInTheDocument();
    expect(screen.getByText(/daily avg/i)).toBeInTheDocument();
  });

  it("should render burn rate table when intervals exist", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: "2024-03-15",
        dailyBurnRate: 10.5,
        estimatedBalance: 150.5,
        daysRemaining: 14,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [
        { newerDate: "2024-03-01", olderDate: "2024-02-28", rate: 8.5, isSkipped: false },
        { newerDate: "2024-03-02", olderDate: "2024-03-01", rate: 12.3, isSkipped: false },
        { newerDate: "2024-03-03", olderDate: "2024-03-02", rate: 9.1, isSkipped: true },
      ],
      currentMonthPurchases: [],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText("Burn Rate (Last 30 Days)")).toBeInTheDocument();
    expect(screen.getByText("Day 1")).toBeInTheDocument();
  });

  it("should render recent purchases list", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: "2024-03-15",
        dailyBurnRate: 10.5,
        estimatedBalance: 150.5,
        daysRemaining: 14,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [
        { date: "2024-03-15", units: 50, amountPaid: 500 },
        { date: "2024-03-01", units: 75, amountPaid: 750 },
      ],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText("Recent Refills")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getAllByText("kWh").length).toBeGreaterThan(0);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("should display critical days remaining in red", () => {
    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: "2024-03-15",
        dailyBurnRate: 50,
        estimatedBalance: 100,
        daysRemaining: 2,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    const daysElement = screen.getByText(/~\d+ days/);
    expect(daysElement).toHaveClass("text-destructive");
  });

  it("should calculate usage since last reading", () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split("T")[0];

    vi.mocked(useQuery).mockReturnValue({
      stats: {
        lastReadingDate: lastWeekStr,
        dailyBurnRate: 10,
        estimatedBalance: 100,
        daysRemaining: 10,
        lastReading: 200,
        isEstimatedBurnRate: false,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
    });

    render(<KPIBreakdown userId="user1" userName="Test User" />);

    expect(screen.getByText(/usage since last reading/i)).toBeInTheDocument();
    expect(screen.getByText(/\(7 days\)/)).toBeInTheDocument();
  });
});
