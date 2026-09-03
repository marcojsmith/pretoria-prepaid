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

  // Note: `meterNumber`/`lowBalanceThreshold` were intentionally removed from
  // this form in phase 2a — meter management (including thresholds) now
  // lives on the Household page's "Meters" card, since these are per-meter
  // settings, not per-user ones. The backend still accepts these fields on
  // `api.users.updateProfile` (see `mirrorMeterFields` in `convex/users.ts`)
  // for other potential callers; this page simply stops using them.
  const [formData, setFormData] = useState({
    preferredName: "",
    pushNotificationsEnabled: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [pushSupported] = useState(isPushSupported());

  useEffect(() => {
    if (profile) {
      setFormData({
        preferredName: profile.preferredName || "",
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
          pushNotificationsEnabled?: boolean;
          pushSubscription?: PushSubscriptionJSON | null;
        } = {
          preferredName: formData.preferredName,
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
        description="Manage your profile and electricity notification preferences."
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
              <CardDescription>How we should address you.</CardDescription>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>
                Configure push notifications. Meter details and low-balance thresholds are now
                managed from the Household page's Meters section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
