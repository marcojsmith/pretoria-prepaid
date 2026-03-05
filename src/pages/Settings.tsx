import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile();

  const [formData, setFormData] = useState({
    preferredName: "",
    meterNumber: "",
    monthlyBudget: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        preferredName: profile.preferredName || "",
        meterNumber: profile.meterNumber || "",
        monthlyBudget: profile.monthlyBudget?.toString() || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updates: {
        preferredName: string;
        meterNumber: string;
        monthlyBudget?: number;
      } = {
        preferredName: formData.preferredName,
        meterNumber: formData.meterNumber,
      };

      if (formData.monthlyBudget) {
        updates.monthlyBudget = parseFloat(formData.monthlyBudget);
      }

      await updateProfile(updates);
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        data-testid="loading-spinner"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <NavMenu />
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">PowerTracker</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and electricity preferences.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>How we should address you and your meter details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preferredName">Preferred Name</Label>
                <Input
                  id="preferredName"
                  placeholder="e.g. John"
                  value={formData.preferredName}
                  onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meterNumber">Meter Number</Label>
                <Input
                  id="meterNumber"
                  placeholder="e.g. 1234567890"
                  value={formData.meterNumber}
                  onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Budgeting</CardTitle>
              <CardDescription>Set a monthly budget to track your spending.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">Monthly Budget (R)</Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  placeholder="e.g. 500"
                  value={formData.monthlyBudget}
                  onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
