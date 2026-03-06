import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { usePurchases } from "@/hooks/usePurchase";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download,
  Copy,
  Loader2,
  Shield,
  FileSpreadsheet,
  Printer,
  FileJson,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { convertToCSV, downloadCSV } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ImportItem {
  date: string;
  amountPaid: number;
  units: number;
}

export default function ExportPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { offlineCount, addBatchPurchases } = usePurchases();
  const { toast } = useToast();

  const profile = useQuery(api.users.getProfile);
  const purchases = useQuery(api.purchases.getPurchases);
  const readings = useQuery(api.readings.getReadings);

  const [userData, setUserData] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Import state
  const [importData, setImportData] = useState<ImportItem[]>([]);
  const [rawCsvText, setRawCsvText] = useState<string>("");
  const [perUnitCost, setPerUnitCost] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const parseCsv = useCallback((text: string, costStr: string): ImportItem[] => {
    if (!text) return [];

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    // Basic CSV parser that handles quotes
    const parseLine = (line: string) => {
      const result = [];
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
    };

    const headers = parseLine(lines[0].toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes("date"));
    const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("paid"));
    const kwhIdx = headers.findIndex((h) => h.includes("kwh") || h.includes("unit"));

    if (dateIdx === -1 || (amountIdx === -1 && kwhIdx === -1)) return [];

    const cost = parseFloat(costStr);
    const parsed: ImportItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const date = cols[dateIdx];
      let amount = parseFloat(cols[amountIdx]);
      let units = parseFloat(cols[kwhIdx]);

      // Attempt to calculate if missing
      if (isNaN(units) && !isNaN(amount) && !isNaN(cost) && cost > 0) {
        units = amount / cost;
      } else if (isNaN(amount) && !isNaN(units) && !isNaN(cost) && cost > 0) {
        amount = units * cost;
      }

      if (date && !isNaN(amount) && !isNaN(units)) {
        parsed.push({ date, amountPaid: amount, units });
      }
    }
    return parsed;
  }, []);

  // Re-parse when cost or raw text changes
  useEffect(() => {
    if (rawCsvText) {
      const parsed = parseCsv(rawCsvText, perUnitCost);
      setImportData(parsed);
    }
  }, [rawCsvText, perUnitCost, parseCsv]);

  const exportUserData = async () => {
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
      Reading: r.reading,
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
      setRawCsvText(text);

      const parsed = parseCsv(text, perUnitCost);
      if (parsed.length === 0) {
        toast({
          title: "Import Error",
          description: "No valid rows found. Check your CSV headers (Date, Amount, kWh).",
          variant: "destructive",
        });
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
      setRawCsvText("");
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

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header offlineCount={offlineCount} />

      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="mx-auto max-w-[800px] space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Data Portability</h1>
            <p className="text-muted-foreground">
              Download your data or generate a printable report for your records.
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
                <Card className="no-print">
                  <CardHeader>
                    <CardTitle className="text-base">Export Purchases</CardTitle>
                    <CardDescription>
                      All token purchase history and tier breakdowns.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={exportPurchasesCSV}
                      className="w-full"
                      variant="outline"
                      data-testid="download-purchases-csv"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="no-print">
                  <CardHeader>
                    <CardTitle className="text-base">Export Readings</CardTitle>
                    <CardDescription>All manual meter readings and dates.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={exportReadingsCSV}
                      className="w-full"
                      variant="outline"
                      data-testid="download-readings-csv"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Import Section */}
              <Card className="no-print">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4" />
                    Import Transactions
                  </CardTitle>
                  <CardDescription>Upload a CSV file to import past transactions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="per-unit-cost">Per Unit Cost (R/kWh) - Optional</Label>
                      <Input
                        id="per-unit-cost"
                        type="number"
                        placeholder="e.g. 3.50"
                        value={perUnitCost}
                        onChange={(e) => setPerUnitCost(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Used to calculate missing kWh or Amount values.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="csv-upload">Select CSV File</Label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="cursor-pointer"
                        ref={fileInputRef}
                      />
                    </div>
                  </div>

                  {importData.length > 0 && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">
                          Preview ({importData.length} records)
                        </h4>
                        <Button
                          size="sm"
                          onClick={finalizeImport}
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
                            {importData.slice(0, 10).map((item, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-2">{item.date}</td>
                                <td className="py-2">R {item.amountPaid.toFixed(2)}</td>
                                <td className="py-2">{item.units.toFixed(1)} kWh</td>
                              </tr>
                            ))}
                            {importData.length > 10 && (
                              <tr>
                                <td colSpan={3} className="pt-2 text-center text-muted-foreground">
                                  + {importData.length - 10} more rows
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
                      Your CSV must include headers: <code className="font-bold">Date</code>,{" "}
                      <code className="font-bold">Amount</code>, and{" "}
                      <code className="font-bold">kWh</code>. Dates should be YYYY-MM-DD or similar.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
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
                        {purchases?.slice(0, 50).map((p) => (
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
                          {readings.slice(0, 50).map((r) => (
                            <tr key={r._id} className="border-t">
                              <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-right">
                                {r.reading?.toFixed(1) || "0.0"}
                              </td>
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Raw System Export</CardTitle>
                  <CardDescription>
                    Export your complete profile and history in JSON format.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                          onClick={() => copyToClipboard(userData)}
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Admin Dashboard info */}
          {isAdmin && (
            <Card className="no-print">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-4 w-4 text-primary" />
                  Admin Resources
                </CardTitle>
                <CardDescription>Access full system logs via the Convex Dashboard.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
