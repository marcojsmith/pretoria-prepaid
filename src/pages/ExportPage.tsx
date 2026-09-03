import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePurchases } from "@/hooks/usePurchase";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Download,
  Copy,
  Loader2,
  FileSpreadsheet,
  Printer,
  FileJson,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { convertToCSV, downloadCSV } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { MAX_ITEMS_PER_PAGE, MAX_EXPORT_ITEMS } from "@/lib/constants";

const IMPORT_PREVIEW_COLS = 3;

interface ImportItem {
  date: string;
  amountPaid: number;
  units: number;
  meterReading: number;
}

// Parse a single CSV line, handling quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Derive missing amount or units from pricePerUnit if available
function deriveAmountOrUnits(options: { amount: number; units: number; pricePerUnit: number }): {
  amount: number;
  units: number;
} {
  const { amount, units, pricePerUnit } = options;
  if (!isNaN(pricePerUnit) && pricePerUnit > 0) {
    if (isNaN(units) && !isNaN(amount)) {
      return { amount, units: amount / pricePerUnit };
    }
    if (isNaN(amount) && !isNaN(units)) {
      return { amount: units * pricePerUnit, units };
    }
  }
  return { amount, units };
}

// eslint-disable-next-line llm-core/max-function-length
export default function ExportPage(): JSX.Element | null {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { offlineCount, addBatchPurchases } = usePurchases();
  const { toast } = useToast();

  const profile = useQuery(api.users.getProfile);
  const purchases = useQuery(api.purchases.getPurchases, {});
  const readings = useQuery(api.readings.getReadings, {});

  const [userData, setUserData] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Import state
  const [importData, setImportData] = useState<ImportItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const findHeaderIndex = (headers: string[], searchTerms: string[]): number => {
    return headers.findIndex((h) => searchTerms.some((term) => h.includes(term)));
  };

  const parseLine = (options: {
    line: string;
    dateIdx: number;
    amountIdx: number;
    kwhIdx: number;
    priceIdx: number;
  }): ImportItem | null => {
    const { line, dateIdx, amountIdx, kwhIdx, priceIdx } = options;
    const cols = parseCsvLine(line);
    const date = cols[dateIdx];
    if (!date) return null;

    const pricePerUnit = priceIdx !== -1 ? parseFloat(cols[priceIdx] ?? "") : NaN;
    const derived = deriveAmountOrUnits({
      amount: parseFloat(cols[amountIdx] ?? ""),
      units: parseFloat(cols[kwhIdx] ?? ""),
      pricePerUnit,
    });

    if (isNaN(derived.amount) || isNaN(derived.units)) return null;
    return { date, amountPaid: derived.amount, units: derived.units, meterReading: 0 };
  };

  const parseCsv = useCallback((text: string): ImportItem[] => {
    if (!text) return [];

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCsvLine((lines[0] ?? "").toLowerCase());
    const dateIdx = findHeaderIndex(headers, ["date"]);
    const amountIdx = findHeaderIndex(headers, ["amount", "paid"]);
    const kwhIdx = findHeaderIndex(headers, ["kwh", "unit"]);
    const priceIdx = findHeaderIndex(headers, ["price", "rate"]);

    if (dateIdx === -1 || (amountIdx === -1 && kwhIdx === -1)) return [];

    return lines.slice(1).reduce<ImportItem[]>((parsed, line) => {
      const item = parseLine({ line, dateIdx, amountIdx, kwhIdx, priceIdx });
      if (item) parsed.push(item);
      return parsed;
    }, []);
  }, []);

  const exportUserData = () => {
    setLoadingUser(true);
    try {
      const data = {
        exported_at: new Date().toISOString(),
        profile,
        purchases: purchases || [],
        readings: readings || [],
      };
      setUserData(JSON.stringify(data, null, 2));
    } catch {
      toast({ title: "Error", description: "Failed to export data", variant: "destructive" });
    } finally {
      setLoadingUser(false);
    }
  };

  const exportPurchasesCSV = () => {
    if (!purchases || purchases.length === 0) {
      toast({ title: "No data", description: "No purchases to export", variant: "destructive" });
      return;
    }

    // Clean data for CSV
    const csvData = purchases.map((p) => ({
      Date: p.date,
      AmountPaid: p.amountPaid,
      TheoreticalCost: p.cost,
      kWh: p.units,
      Tiers: p.tierBreakdown?.map((t) => `${t.label}: ${t.units}kWh`).join(" | ") || "",
    }));

    const csv = convertToCSV(csvData);
    downloadCSV(csv, `purchases_${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Success", description: "Purchases exported to CSV" });
  };

  const exportReadingsCSV = () => {
    if (!readings || readings.length === 0) {
      toast({ title: "No data", description: "No readings to export", variant: "destructive" });
      return;
    }

    const csvData = readings.map((r) => ({
      Date: r.date,
      ReadingPre: r.readingPre,
      ReadingPost: r.readingPost,
    }));

    const csv = convertToCSV(csvData);
    downloadCSV(csv, `readings_${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Success", description: "Readings exported to CSV" });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast({
          title: "Import Error",
          description: "No valid rows found. Check your CSV headers (Date, Amount, kWh).",
          variant: "destructive",
        });
      } else {
        setImportData(parsed);
      }
    };
    reader.readAsText(file);
  };

  const finalizeImport = async () => {
    if (importData.length === 0) return;
    setIsImporting(true);
    try {
      await addBatchPurchases(importData);
      toast({
        title: "Success",
        description: `Successfully initiated import of ${importData.length} records.`,
      });
      setImportData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: "An error occurred during import. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "JSON copied to clipboard" });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Import & Export"
        description="Download your electricity usage data as CSV, print reports, or import past transactions."
        noindex
      />
      <Header offlineCount={offlineCount} />

      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="mx-auto max-w-[800px] space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Import and Export Data</h1>
            <p className="text-muted-foreground">
              Download your data, generate a printable report, or import past transactions.
            </p>
          </div>

          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="no-print grid w-full grid-cols-3">
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </TabsTrigger>
              <TabsTrigger value="print" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                JSON
              </TabsTrigger>
            </TabsList>

            {/* CSV Tab */}
            <TabsContent value="csv" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="no-print space-y-3 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Export Purchases</h3>
                    <p className="text-xs text-muted-foreground">
                      All token purchase history and tier breakdowns.
                    </p>
                  </div>
                  <div>
                    <Button
                      onClick={exportPurchasesCSV}
                      className="w-full"
                      variant="outline"
                      data-testid="download-purchases-csv"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                <div className="no-print space-y-3 rounded-lg border p-4">
                  <div>
                    <h3 className="text-sm font-semibold">Export Readings</h3>
                    <p className="text-xs text-muted-foreground">
                      All manual meter readings and dates.
                    </p>
                  </div>
                  <div>
                    <Button
                      onClick={exportReadingsCSV}
                      className="w-full"
                      variant="outline"
                      data-testid="download-readings-csv"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div className="no-print space-y-4 border-t pt-4">
                <div>
                  <h3 className="text-base font-semibold">Import Transactions</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file to import past transactions.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="csv-upload">Select CSV File</Label>
                      <a
                        href="/import_template.csv"
                        download
                        className="text-[10px] text-primary underline-offset-4 hover:underline"
                      >
                        Download Template
                      </a>
                    </div>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                      ref={fileInputRef}
                    />
                  </div>

                  {importData.length > 0 && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          Preview ({importData.length} records)
                        </h4>
                        <Button
                          size="sm"
                          onClick={() => {
                            void finalizeImport();
                          }}
                          disabled={isImporting}
                          className="gap-2"
                        >
                          {isImporting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Finalize Import
                        </Button>
                      </div>
                      <div className="max-h-[200px] overflow-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="pb-2">Date</th>
                              <th className="pb-2">Amount</th>
                              <th className="pb-2">kWh</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importData.slice(0, MAX_ITEMS_PER_PAGE).map((item, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-2">{item.date}</td>
                                <td className="py-2">R {item.amountPaid.toFixed(2)}</td>
                                <td className="py-2">{item.units.toFixed(1)} kWh</td>
                              </tr>
                            ))}
                            {importData.length > MAX_ITEMS_PER_PAGE && (
                              <tr>
                                <td
                                  colSpan={IMPORT_PREVIEW_COLS}
                                  className="pt-2 text-center text-muted-foreground"
                                >
                                  + {importData.length - MAX_ITEMS_PER_PAGE} more rows
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs">CSV Format Requirement</AlertTitle>
                    <AlertDescription className="text-[10px]">
                      Required: <code className="font-bold">Date</code> and at least one of{" "}
                      <code className="font-bold">Amount</code> or{" "}
                      <code className="font-bold">kWh</code>. Optional:{" "}
                      <code className="font-bold">PricePerUnit</code> (used to calculate missing
                      Amount/kWh).
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>

            {/* Print Tab */}
            <TabsContent value="print" className="space-y-6 pt-4">
              <div className="no-print flex justify-end">
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print/Save as PDF
                </Button>
              </div>

              <div className="print-section space-y-8">
                <div className="hidden border-b-2 border-black pb-4 print:block">
                  <h1 className="text-2xl font-bold">Electricity Usage Report</h1>
                  <p className="text-sm">Generated on {new Date().toLocaleDateString()}</p>
                  <p className="text-sm">User: {user.primaryEmailAddress?.emailAddress}</p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Purchase Summary</h2>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted print:bg-gray-100">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-right">kWh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases?.slice(0, MAX_EXPORT_ITEMS).map((p) => (
                          <tr key={p._id} className="border-t">
                            <td className="px-4 py-2">{new Date(p.date).toLocaleDateString()}</td>
                            <td className="px-4 py-2 text-right">
                              R {p.amountPaid?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-4 py-2 text-right">{p.units?.toFixed(1) || "0.0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {readings && readings.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Meter Readings</h2>
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted print:bg-gray-100">
                          <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2 text-right">Reading (kWh)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {readings.slice(0, MAX_EXPORT_ITEMS).map((r) => (
                            <tr key={r._id} className="border-t">
                              <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-right">{r.readingPost.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* JSON Tab */}
            <TabsContent value="json" className="space-y-4 pt-4">
              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="text-base font-semibold">Raw System Export</h3>
                  <p className="text-sm text-muted-foreground">
                    Export your complete profile and history in JSON format.
                  </p>
                </div>
                <div className="space-y-4">
                  <Button onClick={exportUserData} disabled={loadingUser} size="sm">
                    {loadingUser ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Generate JSON Export
                  </Button>
                  {userData && (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void copyToClipboard(userData);
                          }}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy to Clipboard
                        </Button>
                      </div>
                      <pre className="max-h-[300px] overflow-auto rounded-md bg-muted p-3 text-[10px] text-foreground">
                        {userData}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
