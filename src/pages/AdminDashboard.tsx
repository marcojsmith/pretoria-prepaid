import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/electricity";
import { Loader2, Users, Receipt, TrendingUp, ShieldCheck, Edit2, Check, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Id } from "../../convex/_generated/dataModel";

export default function AdminDashboard() {
  const globalStats = useQuery(api.admin.getGlobalStats);
  const usersList = useQuery(api.admin.getUsersList);
  const recentPurchases = useQuery(api.admin.getRecentPurchases);
  const rates = useQuery(api.rates.getRates);
  const updateRate = useMutation(api.rates.updateRate);
  const { toast } = useToast();

  const [editingRateId, setEditingRateId] = useState<Id<"electricity_rates"> | null>(null);
  const [editRateValues, setEditRateValues] = useState<{
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  } | null>(null);

  const startEditing = (rate: {
    _id: Id<"electricity_rates">;
    tier_label: string;
    min_units: number;
    max_units: number | null;
    rate: number;
  }) => {
    setEditingRateId(rate._id);
    setEditRateValues({
      tier_label: rate.tier_label,
      min_units: rate.min_units,
      max_units: rate.max_units,
      rate: rate.rate,
    });
  };

  const cancelEditing = () => {
    setEditingRateId(null);
    setEditRateValues(null);
  };

  const handleSaveRate = async () => {
    if (!editingRateId || !editRateValues) return;

    const { tier_label, min_units, max_units, rate } = editRateValues;

    if (!tier_label.trim()) {
      toast({
        title: "Invalid Input",
        description: "Tier label cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(min_units) || min_units < 0) {
      toast({
        title: "Invalid Input",
        description: "Minimum units must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    if (max_units !== null && (isNaN(max_units) || max_units <= min_units)) {
      toast({
        title: "Invalid Input",
        description: "Maximum units must be greater than minimum units or left empty.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(rate) || rate < 0) {
      toast({
        title: "Invalid Input",
        description: "Rate must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateRate({
        id: editingRateId,
        tier_label: tier_label.trim(),
        min_units,
        max_units,
        rate,
      });
      toast({
        title: "Rate Updated",
        description: "The electricity rate tier has been updated successfully.",
      });
      setEditingRateId(null);
      setEditRateValues(null);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "There was an error updating the rate tier.",
        variant: "destructive",
      });
    }
  };

  const isLoading =
    globalStats === undefined ||
    usersList === undefined ||
    recentPurchases === undefined ||
    rates === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <SEO title="Admin Dashboard" noindex />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-4 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Recent Purchases
            </TabsTrigger>
            <TabsTrigger
              value="rates"
              className="relative rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Rates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats.totalUsers}</div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Volume
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{globalStats.totalUnits.toFixed(1)} kWh</div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Revenue
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(globalStats.totalRevenue)}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-md border-border shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Avg User Consumption
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {globalStats.avgUnitsPerUser.toFixed(1)} kWh
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-muted-foreground">Database:</span>
                  <span className="text-foreground">Convex (Operational)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-medium text-muted-foreground">Auth:</span>
                  <span className="text-foreground">Clerk (Operational)</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">User Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground">Name</TableHead>
                      <TableHead className="font-bold text-foreground">Email</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Role</TableHead>
                      <TableHead className="font-bold text-foreground">User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersList.map((user) => (
                      <TableRow key={user._id} className="transition-none hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {user.preferredName || "Anonymous"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email || "N/A"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                              user.role === "admin"
                                ? "border-primary/20 bg-primary/10 text-primary"
                                : "border-muted bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {user.userId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Recent Purchases (Global)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground">Date</TableHead>
                      <TableHead className="font-bold text-foreground">User ID</TableHead>
                      <TableHead className="font-bold text-foreground">Units (kWh)</TableHead>
                      <TableHead className="font-bold text-foreground">Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPurchases.map((purchase) => (
                      <TableRow key={purchase._id} className="transition-none hover:bg-muted/30">
                        <TableCell className="text-xs">
                          {new Date(purchase.date).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {purchase.userId}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {purchase.units.toFixed(1)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(purchase.amountPaid)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates">
            <Card className="rounded-md border-border shadow-none">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Electricity Rates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 transition-none hover:bg-muted/50">
                      <TableHead className="font-bold text-foreground">Tier</TableHead>
                      <TableHead className="font-bold text-foreground">Label</TableHead>
                      <TableHead className="font-bold text-foreground">Range (kWh)</TableHead>
                      <TableHead className="font-bold text-foreground">Rate</TableHead>
                      <TableHead className="text-right font-bold text-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate._id} className="transition-none hover:bg-muted/30">
                        <TableCell className="font-medium">Tier {rate.tier_number}</TableCell>
                        <TableCell>
                          {editingRateId === rate._id ? (
                            <Input
                              value={editRateValues?.tier_label}
                              onChange={(e) =>
                                setEditRateValues((prev) =>
                                  prev ? { ...prev, tier_label: e.target.value } : null
                                )
                              }
                              className="h-8 py-1"
                            />
                          ) : (
                            <span className="text-muted-foreground">{rate.tier_label}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRateId === rate._id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={editRateValues?.min_units}
                                onChange={(e) =>
                                  setEditRateValues((prev) =>
                                    prev ? { ...prev, min_units: Number(e.target.value) } : null
                                  )
                                }
                                className="h-8 w-20 py-1"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="number"
                                value={editRateValues?.max_units ?? ""}
                                placeholder="∞"
                                onChange={(e) =>
                                  setEditRateValues((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          max_units:
                                            e.target.value === "" ? null : Number(e.target.value),
                                        }
                                      : null
                                  )
                                }
                                className="h-8 w-20 py-1"
                              />
                            </div>
                          ) : (
                            <span className="text-xs">
                              {rate.min_units} - {rate.max_units === null ? "∞" : rate.max_units}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingRateId === rate._id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">R</span>
                              <Input
                                type="number"
                                step="0.00001"
                                value={editRateValues?.rate}
                                onChange={(e) =>
                                  setEditRateValues((prev) =>
                                    prev ? { ...prev, rate: Number(e.target.value) } : null
                                  )
                                }
                                className="h-8 w-24 py-1"
                              />
                            </div>
                          ) : (
                            <span className="font-bold text-primary">
                              {formatCurrency(rate.rate)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingRateId === rate._id ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveRate}
                                className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditing}
                                className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(rate)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
