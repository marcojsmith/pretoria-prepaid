import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  subscribeUserToPush,
  unsubscribeUserFromPush,
  isPushSupported,
} from "@/lib/push-notifications";

export default function Settings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile();

  const [formData, setFormData] = useState({
    preferredName: "",
    meterNumber: "",
    monthlyBudget: "",
    lowBalanceThreshold: "10",
    pushNotificationsEnabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [pushSupported] = useState(isPushSupported());

  useEffect(() => {
    if (profile) {
      setFormData({
        preferredName: profile.preferredName || "",
        meterNumber: profile.meterNumber || "",
        monthlyBudget: profile.monthlyBudget?.toString() || "",
        lowBalanceThreshold: profile.lowBalanceThreshold?.toString() || "10",
        pushNotificationsEnabled: profile.pushNotificationsEnabled || false,
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
      let pushSubscription = profile?.pushSubscription;

      if (formData.pushNotificationsEnabled && !profile?.pushNotificationsEnabled) {
        // User is enabling push notifications
        try {
          const subscription = await subscribeUserToPush();
          pushSubscription = subscription;
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to enable push notifications.";
          toast.error(errorMessage);
          setFormData((prev) => ({ ...prev, pushNotificationsEnabled: false }));
          setIsSaving(false);
          return; // Stop submission if subscription failed
        }
      } else if (!formData.pushNotificationsEnabled && profile?.pushNotificationsEnabled) {
        // User is disabling push notifications
        await unsubscribeUserFromPush();
        pushSubscription = undefined;
      }

      const updates: {
        preferredName: string;
        meterNumber: string;
        monthlyBudget?: number;
        lowBalanceThreshold?: number;
        pushNotificationsEnabled: boolean;
        pushSubscription?: {
          endpoint: string;
          expirationTime: number | null;
          keys: {
            p256dh: string;
            auth: string;
          };
        };
      } = {
        preferredName: formData.preferredName,
        meterNumber: formData.meterNumber,
        pushNotificationsEnabled: formData.pushNotificationsEnabled,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pushSubscription: pushSubscription as any, // Cast to any because the browser type and Convex type might slightly differ in strictness
      };

      if (formData.monthlyBudget) {
        updates.monthlyBudget = parseFloat(formData.monthlyBudget);
      }

      if (formData.lowBalanceThreshold) {
        updates.lowBalanceThreshold = parseFloat(formData.lowBalanceThreshold);
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
      <Header />

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
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="h-4 w-4 text-primary" />
                Alerts & Budgeting
              </CardTitle>
              <CardDescription>Configure notifications and spending limits.</CardDescription>
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
              <div className="space-y-2">
                <Label htmlFor="lowBalanceThreshold">Low Balance Threshold (kWh)</Label>
                <Input
                  id="lowBalanceThreshold"
                  type="number"
                  placeholder="e.g. 10"
                  value={formData.lowBalanceThreshold}
                  onChange={(e) =>
                    setFormData({ ...formData, lowBalanceThreshold: e.target.value })
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  When your estimated balance falls below this, we'll show an alert (simulating your
                  meter's beep).
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="pushNotifications" className="text-sm font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    {pushSupported
                      ? "Get alerts on your device when your balance is low."
                      : "Push notifications are not supported in this browser."}
                  </p>
                </div>
                <input
                  id="pushNotifications"
                  type="checkbox"
                  disabled={!pushSupported}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                  checked={formData.pushNotificationsEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, pushNotificationsEnabled: e.target.checked })
                  }
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
