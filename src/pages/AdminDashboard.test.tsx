import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminDashboard from "./AdminDashboard";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { BrowserRouter } from "react-router-dom";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="mock-header">Header</div>,
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
      toast: vi.fn(),
    });
  });

  it("renders loading state initially", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    const { container } = render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders dashboard with data", () => {
    (useQuery as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        totalUsers: 10,
        totalUnits: 500,
        totalRevenue: 1000,
        avgUnitsPerUser: 50,
      }) // globalStats
      .mockReturnValueOnce([
        {
          _id: "u1",
          preferredName: "Test",
          email: "test@test.com",
          role: "user",
          userId: "user_1",
        },
      ]) // usersList
      .mockReturnValueOnce([
        { _id: "p1", date: Date.now(), userId: "user_1", units: 50, amountPaid: 100 },
      ]) // recentPurchases
      .mockReturnValueOnce([
        {
          _id: "r1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 2.5,
        },
      ]); // rates

    (useMutation as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
