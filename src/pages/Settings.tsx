import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";
import {
  subscribeUserToPush,
  unsubscribeUserFromPush,
  isPushSupported,
} from "@/lib/push-notifications";
import type { PushSubscriptionJSON } from "@/lib/push-notifications";

// eslint-disable-next-line llm-core/max-function-length
export default function Settings(): JSX.Element | null {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile, loading: profileLoading } = useProfile();

  const [formData, setFormData] = useState({
    preferredName: "",
    meterNumber: "",
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

  const handleSubmit = (e: React.FormEvent) => {
    void (async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);

      try {
        const updates: {
          preferredName?: string;
          meterNumber?: string;
          pushNotificationsEnabled?: boolean;
          pushSubscription?: PushSubscriptionJSON | null;
          lowBalanceThreshold?: number;
        } = {
          preferredName: formData.preferredName,
          meterNumber: formData.meterNumber,
          pushNotificationsEnabled: formData.pushNotificationsEnabled,
        };

        if (formData.pushNotificationsEnabled && !profile?.pushNotificationsEnabled) {
          // User is enabling push notifications
          try {
            updates.pushSubscription = await subscribeUserToPush();
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : "Failed to enable push notifications.";
            toast.error(errorMessage);
            setFormData((prev) => ({ ...prev, pushNotificationsEnabled: false }));
            setIsSaving(false);
            return; // Stop submission if subscription failed
          }
        } else if (!formData.pushNotificationsEnabled && profile?.pushNotificationsEnabled) {
          // User is disabling push notifications — explicitly clear subscription
          await unsubscribeUserFromPush();
          updates.pushSubscription = null;
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
    })(e);
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
      <SEO
        title="Settings"
        description="Manage your profile, meter details, and electricity notification preferences."
        noindex
      />
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
            <CardHeader>
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
            <CardHeader>
              <CardTitle className="text-lg">Alerts & Thresholds</CardTitle>
              <CardDescription>Configure notifications and low balance alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
