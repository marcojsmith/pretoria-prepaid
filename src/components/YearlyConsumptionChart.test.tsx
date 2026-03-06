import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YearlyConsumptionChart } from "./YearlyConsumptionChart";
import { usePurchases } from "@/hooks/usePurchase";

interface MockSelectProps {
  children?: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
}

interface MockSelectTriggerProps {
  children?: React.ReactNode;
  id?: string;
}

interface MockSelectValueProps {
  placeholder?: string;
}

interface MockSelectContentProps {
  children?: React.ReactNode;
}

interface MockSelectItemProps {
  children?: React.ReactNode;
  value?: string;
}

// Mock the hook
vi.mock("@/hooks/usePurchase", () => ({
  usePurchases: vi.fn(),
}));

// Mock Select component
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: MockSelectProps) => (
    <select role="combobox" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: MockSelectTriggerProps) => <button id={id}>{children}</button>,
  SelectValue: ({ placeholder }: MockSelectValueProps) => <span>{placeholder}</span>,
  SelectContent: ({ children }: MockSelectContentProps) => <>{children}</>,
  SelectItem: ({ children, value }: MockSelectItemProps) => (
    <option value={value}>{children}</option>
  ),
}));

describe("YearlyConsumptionChart", () => {
  const mockMonthlyStats = [
    { month: "2026-03", units: 500, cost: 2000, purchases: 2 },
    { month: "2026-02", units: 450, cost: 1800, purchases: 1 },
    { month: "2026-01", units: 600, cost: 2400, purchases: 3 },
    { month: "2025-12", units: 700, cost: 2800, purchases: 4 },
  ];

  it("renders correctly for the current year", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    expect(screen.getByText("Yearly Consumption")).toBeInTheDocument();

    // Check for values (they appear in tooltips and sometimes below bars)
    expect(screen.getAllByText(/500/)).toHaveLength(2); // tooltip + label
    expect(screen.getAllByText(/450/)).toHaveLength(2);
    expect(screen.getAllByText(/600/)).toHaveLength(2);

    // 2025 data should not be visible initially
    expect(screen.queryByText(/700/)).not.toBeInTheDocument();
  });

  it("allows switching years", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => mockMonthlyStats,
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    const yearSelect = screen.getByRole("combobox");
    expect(yearSelect).toHaveValue("2026");

    // Switch to 2025
    fireEvent.change(yearSelect, { target: { value: "2025" } });

    // Now 2025 data (700) should be visible
    expect(screen.getAllByText(/700/)).toHaveLength(2);
  });

  it("shows zero usage for months with no data", () => {
    vi.mocked(usePurchases).mockReturnValue({
      getMonthlyStats: () => [{ month: "2026-01", units: 100, cost: 400, purchases: 1 }],
    } as ReturnType<typeof usePurchases>);

    render(<YearlyConsumptionChart />);

    // Should show 100 for Jan
    expect(screen.getAllByText(/100/)).toHaveLength(2);
    // Should show 0.0 in tooltips for others
    const zeroTooltips = screen.getAllByText(/\b0\.0\b/);
    expect(zeroTooltips.length).toBe(11); // 11 months with zero
  });
});
