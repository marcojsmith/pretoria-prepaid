import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { SEO } from "@/components/SEO";
import { ShareModal } from "@/components/ShareModal";
import { HouseholdMembersList, HouseholdActions } from "@/components/HouseholdMemberList";
import { MeterManagementCard } from "@/components/MeterManagementCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HouseholdMember, HouseholdMeter } from "@/types/household";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import type { Id } from "../../convex/_generated/dataModel";

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create household");
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
      const trimmed = inviteCode.trim();
      let code = trimmed;
      try {
        const url = new URL(trimmed);
        const segments = url.pathname.split("/").filter((s) => s);
        code = segments.pop() ?? trimmed;
      } catch {
        code = trimmed;
      }
      if (!code) code = trimmed;
      await joinHousehold({ code });
      toast.success("Joined household");
      setInviteCode("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join household");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await removeMember({ userId });
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await leaveHousehold();
      toast.success("You have left the household");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave household");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisband = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await disbandHousehold();
      toast.success("Household disbanded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disband household");
    } finally {
      setActionLoading(false);
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
          <NoHouseholdView
            householdName={householdName}
            setHouseholdName={setHouseholdName}
            inviteCode={inviteCode}
            setInviteCode={setInviteCode}
            actionLoading={actionLoading}
            onCreate={() => void handleCreate()}
            onJoin={() => void handleJoin()}
          />
        ) : (
          <HasHouseholdView
            household={household}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onRemove={(userId) => void handleRemove(userId)}
            onLeave={() => void handleLeave()}
            onDisband={() => void handleDisband()}
            onOpenShareModal={() => setShareModalOpen(true)}
          />
        )}
      </main>

      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </div>
  );
}

interface NoHouseholdViewProps {
  householdName: string;
  setHouseholdName: (value: string) => void;
  inviteCode: string;
  setInviteCode: (value: string) => void;
  actionLoading: boolean;
  onCreate: () => void;
  onJoin: () => void;
}

function NoHouseholdView({
  householdName,
  setHouseholdName,
  inviteCode,
  setInviteCode,
  actionLoading,
  onCreate,
  onJoin,
}: NoHouseholdViewProps): JSX.Element {
  return (
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onCreate();
                }
              }}
            />
          </div>
          <Button onClick={onCreate} disabled={actionLoading} className="w-full">
            <Users className="mr-2 h-4 w-4" />
            {actionLoading ? "Creating..." : "Create Household"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Join a Household</CardTitle>
          <CardDescription>Have an invite link or code? Paste it below to join.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite Link or Code</Label>
            <Input
              id="inviteCode"
              placeholder="Paste invite link or code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onJoin();
                }
              }}
            />
          </div>
          <Button onClick={onJoin} disabled={actionLoading} variant="outline" className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            {actionLoading ? "Joining..." : "Join Household"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface HasHouseholdViewProps {
  household: {
    householdId: string;
    name: string;
    members: HouseholdMember[];
    meters?: HouseholdMeter[];
  } | null;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onRemove: (userId: string) => void;
  onLeave: () => void;
  onDisband: () => void;
  onOpenShareModal: () => void;
}

function HasHouseholdView({
  household,
  currentUserId,
  isAdmin,
  onRemove,
  onLeave,
  onDisband,
  onOpenShareModal,
}: HasHouseholdViewProps): JSX.Element {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">{household?.name}</CardTitle>
            <CardDescription>
              {isAdmin ? "You are the household administrator." : "You are a household member."}
            </CardDescription>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={onOpenShareModal}>
              <Share2 className="mr-2 h-4 w-4" />
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {household?.members && (
            <HouseholdMembersList
              members={household.members}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRemove={onRemove}
            />
          )}
        </CardContent>
      </Card>

      {household && (
        <MeterManagementCard
          householdId={household.householdId as Id<"households">}
          meters={household.meters ?? []}
          isAdmin={isAdmin}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-destructive">
            {isAdmin ? "Danger Zone" : "Leave Household"}
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? "Disbanding removes all members and permanently dissolves the household."
              : "You will no longer have access to the shared meter data."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HouseholdActions isAdmin={isAdmin} onLeave={onLeave} onDisband={onDisband} />
        </CardContent>
      </Card>
    </div>
  );
}
