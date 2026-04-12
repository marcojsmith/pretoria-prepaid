import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, LogOut, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { ShareModal } from "@/components/ShareModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";

export default function HouseholdPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    household,
    loading,
    isAdmin,
    inHousehold,
    createHousehold,
    joinHousehold,
    removeMember,
    leaveHousehold,
    disbandHousehold,
  } = useHousehold();

  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreate = async () => {
    if (!householdName.trim()) {
      toast.error("Enter a household name");
      return;
    }
    setActionLoading(true);
    try {
      await createHousehold({ name: householdName });
      toast.success("Household created");
      setHouseholdName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create household");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error("Enter an invite code or paste the full link");
      return;
    }
    setActionLoading(true);
    try {
      const code = inviteCode.trim().split("/").pop() ?? inviteCode.trim();
      await joinHousehold({ code });
      toast.success("Joined household");
      setInviteCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join household");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember({ userId });
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleLeave = async () => {
    try {
      await leaveHousehold();
      toast.success("You have left the household");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave household");
    }
  };

  const handleDisband = async () => {
    try {
      await disbandHousehold();
      toast.success("Household disbanded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disband household");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const currentUserId = user?.id;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Household"
        description="Manage your household and share your electricity account with family members."
        noindex
      />
      <Header />
      <main className="container mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Household</h1>
          <p className="text-sm text-muted-foreground">
            Share your electricity account with family or housemates.
          </p>
        </div>

        {!inHousehold ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Your Account</CardTitle>
                <CardDescription>
                  Create a household and invite others to share your meter data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="householdName">Household Name</Label>
                  <Input
                    id="householdName"
                    placeholder="e.g. The Smith Household"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <Button onClick={handleCreate} disabled={actionLoading} className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  {actionLoading ? "Creating..." : "Create Household"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Join a Household</CardTitle>
                <CardDescription>
                  Have an invite link or code? Paste it below to join.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Link or Code</Label>
                  <Input
                    id="inviteCode"
                    placeholder="Paste invite link or code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  />
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={actionLoading}
                  variant="outline"
                  className="w-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {actionLoading ? "Joining..." : "Join Household"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{household?.name}</CardTitle>
                  <CardDescription>
                    {isAdmin
                      ? "You are the household administrator."
                      : "You are a household member."}
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" onClick={() => setShareModalOpen(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Invite
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {household?.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {member.preferredName ?? member.email ?? "Unknown"}
                            {member.userId === currentUserId && (
                              <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          {member.preferredName && member.email && (
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          )}
                        </div>
                        {member.role === "admin" && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      {isAdmin && member.userId !== currentUserId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {member.preferredName ?? member.email} will lose access to the
                                household data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(member.userId)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Leave Household</CardTitle>
                  <CardDescription>
                    You will no longer have access to the shared meter data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        Leave Household
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave household?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will lose access to all shared meter data and purchases.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                  <CardDescription>
                    Disbanding removes all members and permanently dissolves the household.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disband Household
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disband household?</AlertDialogTitle>
                        <AlertDialogDescription>
                          All members will be removed. This cannot be undone. Your meter data will
                          remain intact.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisband}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Disband
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </div>
  );
}
