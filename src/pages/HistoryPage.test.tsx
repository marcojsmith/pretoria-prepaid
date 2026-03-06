import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import HistoryPage from "./HistoryPage";
import { usePurchases } from "../hooks/usePurchase";
import { useConsumption } from "../hooks/useConsumption";
import { useAuth } from "../hooks/useAuth";
import { useRates } from "../hooks/useRates";
import { Id } from "../../convex/_generated/dataModel";

// Mock the hooks
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useConsumption");
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useRates");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("HistoryPage", () => {
  const mockSignOut = vi.fn();
  const mockAddPurchase = vi.fn();
  const mockDeletePurchase = vi.fn();
  const mockAddReading = vi.fn();
  const mockDeleteReading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        primaryEmailAddress: { emailAddress: "test@example.com" },
      } as unknown as ReturnType<typeof useAuth>["user"],
      loading: false,
      signOut: mockSignOut,
    });
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [],
      addPurchase: mockAddPurchase,
      deletePurchase: mockDeletePurchase,
      unitsThisMonth: 0,
      costThisMonth: 0,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => []),
      offlineCount: 0,
    });
    vi.mocked(useConsumption).mockReturnValue({
      loading: false,
      readings: [],
      stats: null,
      addReading: mockAddReading,
      deleteReading: mockDeleteReading,
    });
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders loading state correctly", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signOut: vi.fn(),
    });
    const { container } = render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );
    // Should show spinner
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders correctly with tabs", () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );
    expect(screen.getByText("Purchases")).toBeInTheDocument();
    expect(screen.getByText("Readings")).toBeInTheDocument();
  });

  it("switches to readings tab and displays empty state", () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Readings"));
    expect(screen.getByText(/No readings logged yet/i)).toBeInTheDocument();
  });

  it("renders readings list and handles deletion", async () => {
    vi.mocked(useConsumption).mockReturnValue({
      loading: false,
      readings: [
        {
          _id: "r1" as unknown as Id<"meter_readings">,
          reading: 120.5,
          date: "2024-03-05",
          _creationTime: Date.now(),
          userId: "user1",
        },
      ],
      stats: null,
      addReading: mockAddReading,
      deleteReading: mockDeleteReading,
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Readings"));
    expect(screen.getByText("120.5 kWh")).toBeInTheDocument();

    const deleteBtn = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-trash2"));

    await act(async () => {
      fireEvent.click(deleteBtn!);
    });

    expect(mockDeleteReading).toHaveBeenCalledWith("r1");
  });

  it("handles logout click", async () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    const logoutButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-log-out"));
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton!);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("handles add purchase form", async () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    const amountInput = screen.getByLabelText(/Amount Paid/i);
    fireEvent.change(amountInput, { target: { value: "100" } });

    const unitsInput = screen.getByLabelText(/kWh Received/i);
    fireEvent.change(unitsInput, { target: { value: "30" } });

    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockAddPurchase).toHaveBeenCalled();
  });
});
