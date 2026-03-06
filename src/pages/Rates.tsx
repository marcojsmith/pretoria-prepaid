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

export default function Rates() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { rates, loading: ratesLoading, updateRate } = useRates();
  const { offlineCount } = usePurchases();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSave = async (id: string) => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      toast({
        title: "Invalid rate",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await updateRate(id, newRate);
    setSaving(false);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update rate",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Rate updated successfully",
      });
      setEditingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header offlineCount={offlineCount} />

      <main className="container mx-auto px-4 py-6">
        <div className="mx-auto max-w-[600px]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Electricity Rates</CardTitle>
              <p className="text-xs text-muted-foreground">
                South African prepaid electricity pricing tiers (VAT inclusive)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rates.map((rate) => (
                  <div
                    key={rate._id}
                    className="flex items-center justify-between rounded-md border border-muted bg-secondary-foreground p-3"
                  >
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
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-24 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSave(rate._id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}>
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
                            onClick={() => handleEdit(rate._id, rate.rate)}
                            data-testid="edit-rate-button"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
