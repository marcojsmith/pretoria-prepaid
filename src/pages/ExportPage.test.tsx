import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Hoist mocks before imports
const { mockConvertToCSV, mockDownloadCSV } = vi.hoisted(() => ({
  mockConvertToCSV: vi.fn(() => "mock,csv"),
  mockDownloadCSV: vi.fn(),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    convertToCSV: mockConvertToCSV,
    downloadCSV: mockDownloadCSV,
  };
});

import ExportPage from "./ExportPage";
import { useAuth } from "../hooks/useAuth";
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

  const universalDataBase = [
    {
      _id: "p1",
      date: "2026-03-01",
      amountPaid: 100,
      units: 30,
      cost: 90,
      tierBreakdown: [{ label: "T1", units: 30 }],
      readingPre: 470,
      readingPost: 500,
      source: "purchase",
    },
  ];
  const universalData: typeof universalDataBase & { preferredName?: string; email?: string } =
    Object.assign(universalDataBase, {
      preferredName: "Test User",
      email: "test@example.com",
    });

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

    vi.mocked(useQuery).mockReturnValue(universalData as unknown as ReturnType<typeof useQuery>);

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
    expect(screen.getByText(/Import and Export Data/i)).toBeInTheDocument();
  });

  it("handles purchase CSV export", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const downloadBtn = screen.getByTestId("download-purchases-csv");
    fireEvent.click(downloadBtn);

    expect(mockConvertToCSV).toHaveBeenCalled();
    expect(mockDownloadCSV).toHaveBeenCalled();
  });

  it("handles reading CSV export", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const downloadBtn = screen.getByTestId("download-readings-csv");
    fireEvent.click(downloadBtn);

    expect(mockConvertToCSV).toHaveBeenCalled();
    expect(mockDownloadCSV).toHaveBeenCalled();
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
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const exportButton = screen.getByRole("button", { name: /Generate JSON Export/i });

    act(() => {
      fireEvent.click(exportButton);
    });

    expect(screen.getByText(/exported_at/i)).toBeInTheDocument();

    const copyButton = screen.getByRole("button", { name: /Copy to Clipboard/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Copied" }));
    });
  });

  it("handles logout", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Log out/i);
    expect(logoutButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(logoutButton);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("handles CSV import with PricePerUnit calculations", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Select CSV File/i);
    const csvContent = `Date,Amount,kWh,PricePerUnit
2026-03-01,100,,2.0
2026-03-02,,50,3.0`;
    const file = new File([csvContent], "import.csv", { type: "text/csv" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview \(2 records\)/i)).toBeInTheDocument();
    });

    // We can't rely on exact text "50.0 kWh" if units and values are split,
    // but in this test we are just checking if calculation works.
    // The amount 150 (50 * 3.0) should be calculated and displayed
    expect(screen.getByText(/R 150.00/i)).toBeInTheDocument();

    const importButton = screen.getByRole("button", { name: /Finalize Import/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Success" }));
    });
  });

  it("handles empty CSV file import", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Select CSV File/i);
    const file = new File([""], "empty.csv", { type: "text/csv" });

    act(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.queryByText(/Preview/)).not.toBeInTheDocument();
  });

  it("shows error toast for invalid CSV data", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Select CSV File/i);
    const csvContent = `InvalidColumn
invalid data`;
    const file = new File([csvContent], "import.csv", { type: "text/csv" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
    });
  });

  it("shows 'No data' toast when exporting empty purchases", () => {
    vi.mocked(useQuery).mockReturnValue([] as unknown as ReturnType<typeof useQuery>);

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const downloadBtn = screen.getByTestId("download-purchases-csv");
    fireEvent.click(downloadBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No data", variant: "destructive" })
    );
  });

  it("shows 'No data' toast when exporting empty readings", () => {
    vi.mocked(useQuery).mockReturnValue([] as unknown as ReturnType<typeof useQuery>);

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const downloadBtn = screen.getByTestId("download-readings-csv");
    fireEvent.click(downloadBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "No data", variant: "destructive" })
    );
  });

  it("shows error toast when import batch fails", async () => {
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      offlineCount: 0,
      addBatchPurchases: vi.fn().mockRejectedValue(new Error("Import failed")),
    } as unknown as ReturnType<typeof usePurchases>);

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Select CSV File/i);
    const csvContent = `Date,Amount,kWh\n2026-03-01,100,30`;
    const file = new File([csvContent], "import.csv", { type: "text/csv" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview \(1 records?\)/i)).toBeInTheDocument();
    });

    const importButton = screen.getByRole("button", { name: /Finalize Import/i });
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Import Failed" }));
    });
  });

  it("parseCsv handles quoted values with commas", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/Select CSV File/i);
    const csvContent = `"Date","Amount Paid","kWh"\n"2026-03-01","100.00","30.5"`;
    const file = new File([csvContent], "import.csv", { type: "text/csv" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview \(1 records?\)/i)).toBeInTheDocument();
    });
  });
});
