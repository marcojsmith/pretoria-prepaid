import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Hoist mocks before imports
const { mockConvertToCSV, mockDownloadCSV } = vi.hoisted(() => ({
  mockConvertToCSV: vi.fn(() => "mock,csv"),
  mockDownloadCSV: vi.fn(),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    convertToCSV: mockConvertToCSV,
    downloadCSV: mockDownloadCSV,
  };
});

import ExportPage from "./ExportPage";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { usePurchases } from "../hooks/usePurchase";
import { useToast } from "../hooks/use-toast";
import { useQuery } from "convex/react";

interface MockDropdownMenuProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

interface MockTabsProps {
  children?: React.ReactNode;
  defaultValue?: string;
  value?: string;
}

// Mock everything
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useUserRole");
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/use-toast");
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

// Mock DropdownMenu to render children directly for easier testing
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: MockDropdownMenuProps) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

// Mock Tabs components to just render children
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: MockTabsProps) => (
    <div data-testid="mock-tabs" data-default={defaultValue}>
      {children}
    </div>
  ),
  TabsList: ({ children }: MockTabsProps) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: MockTabsProps) => (
    <button onClick={() => {}} data-value={value}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: MockTabsProps) => (
    <div data-testid={`content-${value}`}>{children}</div>
  ),
}));

describe("ExportPage", () => {
  const mockSignOut = vi.fn();
  const mockToast = vi.fn();

  const mockPurchases = [
    {
      _id: "p1",
      date: "2026-03-01",
      amountPaid: 100,
      units: 30,
      cost: 90,
      tierBreakdown: [{ label: "T1", units: 30 }],
    },
  ];
  const mockReadings = [{ _id: "r1", date: "2026-03-01", reading: 500 }];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Test",
        primaryEmailAddress: { emailAddress: "test@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: mockSignOut,
    });
    vi.mocked(useUserRole).mockReturnValue({ isAdmin: false, loading: false });
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      offlineCount: 0,
      addBatchPurchases: vi.fn(),
    } as unknown as ReturnType<typeof usePurchases>);
    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    } as unknown as ReturnType<typeof useToast>);

    // Order of calls in ExportPage: 1. getProfile, 2. getPurchases, 3. getReadings
    vi.mocked(useQuery)
      .mockReturnValueOnce({ preferredName: "Test User" })
      .mockReturnValueOnce(mockPurchases)
      .mockReturnValueOnce(mockReadings);

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.stubGlobal("print", vi.fn());
  });

  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Data Portability/i)).toBeInTheDocument();
  });

  it("handles purchase CSV export", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const downloadBtn = screen.getByTestId("download-purchases-csv");
    fireEvent.click(downloadBtn);

    // We verify the logic is hit by checking toast success
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Success" }));
  });

  it("handles reading CSV export", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const downloadBtn = screen.getByTestId("download-readings-csv");
    fireEvent.click(downloadBtn);

    // We verify the logic is hit by checking toast success
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Success" }));
  });

  it("handles print action", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const printBtn = screen.getByRole("button", { name: /Print\/Save as PDF/i });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
  });

  it("handles export and copy to clipboard", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const exportButton = screen.getByRole("button", { name: /Generate JSON Export/i });

    await act(async () => {
      fireEvent.click(exportButton);
    });

    expect(screen.getByText(/exported_at/i)).toBeInTheDocument();

    const copyButton = screen.getByRole("button", { name: /Copy to Clipboard/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Copied" }));
  });

  it("handles logout", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Log out/i);
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("shows admin card when user is admin", async () => {
    vi.mocked(useUserRole).mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Admin Resources/i)).toBeInTheDocument();
  });
});
