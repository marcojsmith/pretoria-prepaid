import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Zap, Download, Copy, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const profile = useQuery(api.users.getProfile);
  const purchases = useQuery(api.purchases.getPurchases);

  const [userData, setUserData] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const exportUserData = async () => {
    setLoadingUser(true);
    try {
      const data = {
        exported_at: new Date().toISOString(),
        profile,
        purchases: purchases || [],
      };
      setUserData(JSON.stringify(data, null, 2));
    } catch {
      toast({ title: "Error", description: "Failed to export data", variant: "destructive" });
    } finally {
      setLoadingUser(false);
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
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <NavMenu />
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">PowerTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {user.primaryEmailAddress?.emailAddress}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSignOut}>
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 px-4 py-4">
        <div className="mx-auto max-w-[600px] space-y-4">
          {/* User Export */}
          <Card data-testid="export-user-data-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-4 w-4" />
                Export My Data
              </CardTitle>
              <CardDescription>Export your profile and purchase history as JSON</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportUserData} disabled={loadingUser} size="sm">
                {loadingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export My Data
              </Button>
              {userData && (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(userData)}>
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                  <pre className="max-h-[400px] overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
                    {userData}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Export note */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-4 w-4" />
                  Admin Dashboard
                </CardTitle>
                <CardDescription>Use the Convex Dashboard to view all system data.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
