import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminDashboard from "./AdminDashboard";
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
}));

// Mock Tabs with actual state
vi.mock("@/components/ui/tabs", () => {
  const Tabs = ({ children, defaultValue }: any) => {
    const [value, setValue] = React.useState(defaultValue);
    return (
      <div data-testid="mock-tabs">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              activeValue: value,
              onValueChange: setValue,
            });
          }
          return child;
        })}
      </div>
    );
  };

  const TabsList = ({ children, activeValue, onValueChange }: any) => (
    <div data-testid="mock-tabs-list">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeValue,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );

  const TabsTrigger = ({ children, value, activeValue, onValueChange }: any) => (
    <button role="tab" aria-selected={activeValue === value} onClick={() => onValueChange(value)}>
      {children}
    </button>
  );

  const TabsContent = ({ children, value, activeValue }: any) => {
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
      email: null as any, // Trigger N/A branch on line 389
      role: "admin",
      userId: "user_2",
    },
  ];

  const mockRecentPurchases = [
    { _id: "p1", date: Date.now(), userId: "user_1", units: 50.5, amountPaid: 100.25 },
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

  it("renders loading state when usersList is null", () => {
    (useAdmin as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      globalStats: mockGlobalStats,
      usersList: null, // Trigger loading branch
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

  it("renders anonymous users and N/A emails", async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /users/i }));

    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("validates empty label", async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);

    const labelInput = screen.getByDisplayValue("Tier 1 Label");
    fireEvent.change(labelInput, { target: { value: "" } });
    fireEvent.click(screen.getByTestId("icon-check").parentElement!);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("validates invalid min units", async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);

    const minInput = screen.getByDisplayValue("0");
    fireEvent.change(minInput, { target: { value: "-1" } });
    fireEvent.click(screen.getByTestId("icon-check").parentElement!);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("validates invalid max units", async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);

    const maxInput = screen.getByDisplayValue("100");
    fireEvent.change(maxInput, { target: { value: "0" } }); // Trigger max_units <= min_units
    fireEvent.click(screen.getByTestId("icon-check").parentElement!);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Invalid Input",
      })
    );
  });

  it("validates invalid rate", async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);

    const rateInput = screen.getByDisplayValue("2.5");
    fireEvent.change(rateInput, { target: { value: "-1" } });
    fireEvent.click(screen.getByTestId("icon-check").parentElement!);
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
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);

    const rateInput = screen.getByDisplayValue("2.5");
    fireEvent.change(rateInput, { target: { value: "3.5" } });

    fireEvent.click(screen.getByTestId("icon-check").parentElement!);

    await waitFor(() => {
      expect(mockUpdateRate).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Rate Updated" }));
    });
  });

  it("handles cancel editing", async () => {
    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole("tab", { name: /rates/i }));
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);
    fireEvent.click(screen.getByTestId("icon-x").parentElement!);

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
    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);
    fireEvent.click(screen.getByTestId("icon-check").parentElement!);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Update Failed" }));
    });
  });

  it("handles null max_units in inputs", async () => {
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

    fireEvent.click(screen.getByTestId("icon-edit").parentElement!);
    const inputs = screen.getAllByRole("spinbutton");
    const maxInput = inputs.find((i) => (i as HTMLInputElement).placeholder === "∞");

    fireEvent.change(maxInput!, { target: { value: "200" } });
    fireEvent.change(maxInput!, { target: { value: "" } });
    expect((maxInput as HTMLInputElement).value).toBe("");
  });
});
