import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MeterSwitcher } from "./MeterSwitcher";
import { useMeters } from "@/hooks/useMeters";
import type { Id } from "../../convex/_generated/dataModel";

vi.mock("@/hooks/useMeters", () => ({
  useMeters: vi.fn(),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

const baseMeters = [
  {
    meterId: "m1" as Id<"meters">,
    householdId: "h1" as Id<"households">,
    householdName: "Home",
    name: "Main",
    isActive: true,
    myRole: "admin" as const,
  },
  {
    meterId: "m2" as Id<"meters">,
    householdId: "h1" as Id<"households">,
    householdName: "Home",
    name: "Cottage",
    meterNumber: "999",
    isActive: false,
    myRole: "admin" as const,
  },
];

describe("MeterSwitcher", () => {
  const mockSetActiveMeter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockUseMeters(overrides: Partial<ReturnType<typeof useMeters>>) {
    vi.mocked(useMeters).mockReturnValue({
      meters: undefined,
      activeMeter: undefined,
      loading: false,
      setActiveMeter: mockSetActiveMeter,
      addMeter: vi.fn(),
      updateMeter: vi.fn(),
      archiveMeter: vi.fn(),
      ...overrides,
    } as unknown as ReturnType<typeof useMeters>);
  }

  it("renders nothing when there are 0 meters", () => {
    mockUseMeters({ meters: [] });
    const { container } = render(<MeterSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is exactly 1 meter", () => {
    mockUseMeters({ meters: [baseMeters[0]!], activeMeter: baseMeters[0] });
    const { container } = render(<MeterSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each meter option when there are 2+ meters", () => {
    mockUseMeters({ meters: baseMeters, activeMeter: baseMeters[0] });
    render(<MeterSwitcher />);

    expect(screen.getAllByText("Main").length).toBeGreaterThan(0);
    expect(screen.getByText("Cottage")).toBeInTheDocument();
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("calls setActiveMeter with the selected meter id", () => {
    mockSetActiveMeter.mockResolvedValue(undefined);
    mockUseMeters({ meters: baseMeters, activeMeter: baseMeters[0] });
    render(<MeterSwitcher />);

    fireEvent.click(screen.getByText("Cottage"));

    expect(mockSetActiveMeter).toHaveBeenCalledWith("m2");
  });

  it("disables the options while a switch is in flight", () => {
    let resolveSwitch: (() => void) | undefined;
    mockSetActiveMeter.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSwitch = resolve;
      })
    );
    mockUseMeters({ meters: baseMeters, activeMeter: baseMeters[0] });
    render(<MeterSwitcher />);

    fireEvent.click(screen.getByText("Cottage"));

    const buttons = screen.getAllByRole("button");
    expect(buttons.every((btn) => btn.hasAttribute("disabled"))).toBe(true);

    resolveSwitch?.();
  });
});
