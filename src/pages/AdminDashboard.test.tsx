import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminDashboard from "./AdminDashboard";
import { useQuery } from "convex/react";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { BrowserRouter } from "react-router-dom";
import React from "react";

vi.mock("@/hooks/useAdmin", () => ({
  useAdmin: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(),
}));

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="mock-header">Header</div>,
}));

vi.mock("@/components/SEO", () => ({
  SEO: ({ title }: { title: string }) => <div data-testid="mock-seo">{title}</div>,
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
  ShieldCheck: () => <div data-testid="icon-shield">Shield</div>,
  Users: () => <div data-testid="icon-users">Users</div>,
  TrendingUp: () => <div data-testid="icon-trending">Trending</div>,
  Receipt: () => <div data-testid="icon-receipt">Receipt</div>,
  Edit2: () => <div data-testid="icon-edit">Edit</div>,
  Check: () => <div data-testid="icon-check">Check</div>,
  X: () => <div data-testid="icon-x">X</div>,
  ArrowRight: () => <span data-testid="icon-arrow-right">→</span>,
}));

// Mock Tabs with actual state
interface TabsProps {
  children?: React.ReactNode;
  defaultValue?: string;
}
interface TabsListProps {
  children?: React.ReactNode;
  activeValue: string;
  onValueChange: (v: string) => void;
}
interface TabsTriggerProps {
  children?: React.ReactNode;
  value?: string;
  activeValue: string;
  onValueChange?: (v: string) => void;
}
interface TabsContentProps {
  children?: React.ReactNode;
  value?: string;
  activeValue?: string;
}

vi.mock("@/components/ui/tabs", () => {
  const Tabs = ({ children, defaultValue }: TabsProps) => {
    const [value, setValue] = React.useState(defaultValue ?? "");
    return (
      <div data-testid="mock-tabs">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<TabsListProps>, {
              activeValue: value,
              onValueChange: setValue,
            });
          }
          return child;
        })}
      </div>
    );
  };

  const TabsList = ({ children, activeValue, onValueChange }: TabsListProps) => (
    <div data-testid="mock-tabs-list">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<TabsTriggerProps>, {
            activeValue: activeValue ?? "",
            onValueChange: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );

  const TabsTrigger = ({ children, value, activeValue, onValueChange }: TabsTriggerProps) => (
    <button
      role="tab"
      aria-selected={activeValue === value}
      onClick={() => onValueChange?.(value ?? "")}
    >
      {children}
    </button>
  );

  const TabsContent = ({ children, value, activeValue }: TabsContentProps) => {
    if (activeValue !== value) return null;
    return <div data-testid={`content-${value}`}>{children}</div>;
  };

  return { Tabs, TabsList, TabsTrigger, TabsContent };
});

describe("AdminDashboard", () => {
  const mockToast = vi.fn();
  const mockUpdateRate = vi.fn();

  const mockGlobalStats = {
    totalUsers: 10,
    totalUnits: 500.5,
    totalRevenue: 1000.75,
    avgUnitsPerUser: 50.05,
  };

  const mockUsersList = [
    {
      _id: "u1",
      preferredName: "Test User",
      email: "test@test.com",
      role: "user",
      userId: "user_1",
    },
    {
      _id: "u2",
      preferredName: "",
      email: null as unknown as string, // Trigger N/A branch on line 389
      role: "admin",
      userId: "user_2",
    },
  ];

  const mockRecentPurchases = [
    {
      _id: "p1",
      date: Date.now(),
      userId: "user_1",
      units: 50.5,
      amountPaid: 100.25,
      readingPre: 100.5,
      readingPost: 151.0,
      effectiveRate: 2.0,
    },
  ];

  const mockRates = [
    {
      _id: "r1",
      tier_number: 1,
      tier_label: "Tier 1 Label",
      min_units: 0,
      max_units: 100,
      rate: 2.5,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
      toast: mockToast,
    });
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: mockUsersList,
      recentPurchases: mockRecentPurchases,
      rates: mockRates,
      updateRate: mockUpdateRate,
    });
  });

  it("renders loading state when globalStats is null", () => {
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: null, // Trigger loading branch
      usersList: [],
      recentPurchases: [],
      rates: [],
      updateRate: mockUpdateRate,
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders loading state when usersListStatus is LoadingFirstPage", () => {
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: true,
      globalStats: mockGlobalStats,
      usersList: [],
      usersListStatus: "LoadingFirstPage",
      loadMoreUsers: vi.fn(),
      recentPurchases: [],
      rates: [],
      updateRate: mockUpdateRate,
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders loading state when recentPurchases is null", () => {
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: [],
      recentPurchases: null, // Trigger loading branch
      rates: [],
      updateRate: mockUpdateRate,
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders loading state when rates is null", () => {
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: [],
      recentPurchases: [],
      rates: null, // Trigger loading branch
      updateRate: mockUpdateRate,
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders anonymous users and N/A emails", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /users/i }));

    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("validates empty label", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);

    const labelInput = screen.getByDisplayValue("Tier 1 Label");
    fireEvent.change(labelInput, { target: { value: "" } });
    fireEvent.click(screen.getByTestId("icon-check").parentElement as HTMLElement);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("validates invalid min units", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);

    const minInput = screen.getByDisplayValue("0");
    fireEvent.change(minInput, { target: { value: "-1" } });
    fireEvent.click(screen.getByTestId("icon-check").parentElement as HTMLElement);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("validates invalid max units", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);

    const maxInput = screen.getByDisplayValue("100");
    fireEvent.change(maxInput, { target: { value: "0" } }); // Trigger max_units <= min_units
    fireEvent.click(screen.getByTestId("icon-check").parentElement as HTMLElement);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("validates invalid rate", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);

    const rateInput = screen.getByDisplayValue("2.5");
    fireEvent.change(rateInput, { target: { value: "-1" } });
    fireEvent.click(screen.getByTestId("icon-check").parentElement as HTMLElement);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("handles rate editing lifecycle", async () => {
    mockUpdateRate.mockResolvedValue({});

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);

    const rateInput = screen.getByDisplayValue("2.5");
    fireEvent.change(rateInput, { target: { value: "3.5" } });

    fireEvent.click(screen.getByTestId("icon-check").parentElement as HTMLElement);

    await waitFor(() => {
      expect(mockUpdateRate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Rate Updated" }));
    });
  });

  it("handles cancel editing", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);
    fireEvent.click(screen.getByTestId("icon-x").parentElement as HTMLElement);

    expect(screen.queryByDisplayValue("Tier 1 Label")).not.toBeInTheDocument();
    expect(screen.getByText("Tier 1 Label")).toBeInTheDocument();
  });

  it("handles update failure", async () => {
    mockUpdateRate.mockRejectedValue(new Error("Failed"));

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);
    fireEvent.click(screen.getByTestId("icon-check").parentElement as HTMLElement);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Update Failed" }));
    });
  });

  it("handles null max_units in inputs", () => {
    const ratesWithNull = [{ ...mockRates[0], max_units: null }];
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: mockUsersList,
      recentPurchases: mockRecentPurchases,
      rates: ratesWithNull,
      updateRate: mockUpdateRate,
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    expect(screen.getByText("0 - ∞")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("icon-edit").parentElement as HTMLElement);
    const inputs = screen.getAllByRole("spinbutton");
    const maxInput = inputs.find((i) => (i as HTMLInputElement).placeholder === "∞");

    fireEvent.change(maxInput as HTMLElement, { target: { value: "200" } });
    fireEvent.change(maxInput as HTMLElement, { target: { value: "" } });
    expect((maxInput as HTMLInputElement).value).toBe("");
  });

  it("renders KPI Breakdown tab and shows user selector", () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    expect(screen.getByText(/Select a user/i)).toBeInTheDocument();
  });

  it("KPI breakdown shows loading state when kpiData is undefined", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "user_1" } });

    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("KPI breakdown renders with full KPI data", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      stats: {
        lastReadingDate: "2026-01-01",
        lastReading: 500,
        dailyBurnRate: 10,
        isEstimatedBurnRate: false,
        estimatedBalance: 200,
        daysRemaining: 20,
        daysRemainingUntilLow: 15,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
      profile: { lowBalanceThreshold: 50 },
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user_1" } });

    expect(screen.getByText("Estimated Balance")).toBeInTheDocument();
    expect(screen.getByText("Days Remaining")).toBeInTheDocument();
  });

  it("KPI breakdown shows no stats message when stats is null", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      stats: null,
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
      profile: { lowBalanceThreshold: 50 },
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user_1" } });

    expect(screen.getByText("No meter readings found for this user yet.")).toBeInTheDocument();
  });

  it("KPI breakdown renders purchase tables when data present", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      stats: {
        lastReadingDate: "2026-01-01",
        lastReading: 500,
        dailyBurnRate: 10,
        isEstimatedBurnRate: false,
        estimatedBalance: 200,
        daysRemaining: 20,
        daysRemainingUntilLow: 15,
      },
      intervals: [],
      currentMonthPurchases: [{ date: "2026-04-01", units: 50, amountPaid: 200 }],
      recentPurchases: [
        { date: "2026-03-01", readingPre: 400, readingPost: 450, units: 50, amountPaid: 200 },
      ],
      profile: { lowBalanceThreshold: 50 },
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user_1" } });

    expect(screen.getByText("This Month's Purchases")).toBeInTheDocument();
    expect(screen.getByText("Past 12 Purchases")).toBeInTheDocument();
  });

  it("KPI breakdown shows empty state when no intervals", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      stats: {
        lastReadingDate: "2026-01-01",
        lastReading: 500,
        dailyBurnRate: 10,
        isEstimatedBurnRate: false,
        estimatedBalance: 200,
        daysRemaining: 20,
        daysRemainingUntilLow: 15,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
      profile: { lowBalanceThreshold: 50 },
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user_1" } });

    expect(
      screen.getByText("Need at least 2 purchase readings to compute a burn rate.")
    ).toBeInTheDocument();
  });

  it("KPI breakdown shows estimated burn rate note", () => {
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      stats: {
        lastReadingDate: "2026-01-01",
        lastReading: 500,
        dailyBurnRate: 10,
        isEstimatedBurnRate: true,
        estimatedBalance: 200,
        daysRemaining: 20,
        daysRemainingUntilLow: 15,
      },
      intervals: [],
      currentMonthPurchases: [],
      recentPurchases: [],
      profile: { lowBalanceThreshold: 50 },
    });
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /kpi/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "user_1" } });

    expect(screen.getByText("(estimated default)")).toBeInTheDocument();
  });

  it("recent purchases tab shows dash when readingPre/readingPost null", () => {
    const purchasesWithNullReadings = [
      {
        _id: "p1",
        date: Date.now(),
        userId: "user_1",
        units: 50.5,
        amountPaid: 100.25,
        readingPre: null,
        readingPost: null,
        effectiveRate: 2.0,
      },
    ];
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: mockUsersList,
      recentPurchases: purchasesWithNullReadings,
      rates: mockRates,
      updateRate: mockUpdateRate,
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /recent purchases/i }));

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("recent purchases tab shows dash when effectiveRate null", () => {
    const purchasesWithNullRate = [
      {
        _id: "p1",
        date: Date.now(),
        userId: "user_1",
        units: 50.5,
        amountPaid: 100.25,
        readingPre: 100.5,
        readingPost: 151.0,
        effectiveRate: null,
      },
    ];
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: mockUsersList,
      recentPurchases: purchasesWithNullRate,
      rates: mockRates,
      updateRate: mockUpdateRate,
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /recent purchases/i }));

    const cells = screen.getAllByText("—");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});
