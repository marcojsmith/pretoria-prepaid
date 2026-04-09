import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRates } from "@/hooks/useRates";
import { usePurchases } from "@/hooks/usePurchase";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/electricity";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { RATE_MIN, RATE_MAX, RATE_INVALID_MESSAGE } from "../../convex/rates";

interface ElectricityRateRow {
  _id: string;
  tier_label: string;
  min_units: number;
  max_units: number | null;
  rate: number;
}

function RateRow({
  rate,
  editingId,
  editValue,
  saving,
  isAdmin,
  onEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: {
  rate: ElectricityRateRow;
  editingId: string | null;
  editValue: string;
  saving: boolean;
  isAdmin: boolean;
  onEdit: (id: string, currentRate: number) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-muted bg-card p-3">
      <div className="flex-1">
        <p className="text-sm font-medium">{rate.tier_label}</p>
        <p className="text-xs text-muted-foreground">
          {rate.min_units}-{rate.max_units ?? "∞"} kWh
        </p>
      </div>
      {editingId === rate._id ? (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.00001"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="h-8 w-24 text-xs"
          />
          <Button size="sm" variant="ghost" onClick={() => onSave(rate._id)} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{formatCurrency(rate.rate)}/kWh</span>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(rate._id, rate.rate)}
              data-testid="edit-rate-button"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Rates(): JSX.Element | null {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { rates, loading: ratesLoading, updateRate } = useRates();
  const { offlineCount } = usePurchases();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingSave, setPendingSave] = useState<{
    id: string;
    newRate: number;
    oldRate: number;
  } | null>(null);

  if (authLoading || ratesLoading || roleLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-testid="loading-spinner"
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleEdit = (id: string, currentRate: number) => {
    setEditingId(id);
    setEditValue(currentRate.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = (id: string): void => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate < RATE_MIN || newRate > RATE_MAX) {
      toast({
        title: "Invalid rate",
        description: RATE_INVALID_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    const currentRate = rates.find((r) => r._id === id);
    setPendingSave({ id, newRate, oldRate: currentRate?.rate ?? 0 });
  };

  const confirmSave = async (): Promise<void> => {
    if (!pendingSave) return;
    setSaving(true);
    try {
      const { error } = await updateRate(pendingSave.id, pendingSave.newRate);
      if (error) {
        toast({ title: "Error", description: "Failed to update rate", variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Rate updated successfully" });
      setEditingId(null);
    } catch {
      toast({ title: "Error", description: "Failed to update rate", variant: "destructive" });
    } finally {
      setSaving(false);
      setPendingSave(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Electricity Rates"
        description="View current prepaid electricity rates and pricing tiers for Pretoria and South Africa (VAT inclusive)."
        noindex
      />
      <Header offlineCount={offlineCount} />
      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-[600px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Electricity Rates</CardTitle>
              <p className="text-xs text-muted-foreground">
                South African prepaid electricity pricing tiers (VAT inclusive)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rates.map((rate) => (
                  <RateRow
                    key={rate._id}
                    rate={rate}
                    editingId={editingId}
                    editValue={editValue}
                    saving={saving}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onSave={(id) => {
                      handleSave(id);
                    }}
                    onCancel={handleCancel}
                    onEditValueChange={setEditValue}
                  />
                ))}
              </div>

              {!isAdmin && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Contact an administrator to request rate changes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <AlertDialog
        open={pendingSave !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSave(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rate Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change rate from{" "}
              <strong>{pendingSave ? formatCurrency(pendingSave.oldRate) : ""}/kWh</strong> to{" "}
              <strong>{pendingSave ? formatCurrency(pendingSave.newRate) : ""}/kWh</strong>? This
              will affect all users' cost calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSave(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmSave();
              }}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
