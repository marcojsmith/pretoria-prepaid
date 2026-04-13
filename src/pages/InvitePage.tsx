import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { useHousehold } from "@/hooks/useHousehold";
import type { InviteData } from "@/types/household";

function InvalidInviteView({ onNavigateHome }: { onNavigateHome: () => void }): JSX.Element {
  return (
    <div className="space-y-2 text-center">
      <p className="font-medium">Invalid invite link</p>
      <p className="text-sm text-muted-foreground">This invite link is not valid.</p>
      <Button variant="outline" onClick={onNavigateHome} className="w-full">
        Go Home
      </Button>
    </div>
  );
}

function ExpiredInviteView({
  expired,
  used,
  onNavigateHome,
}: {
  expired: boolean;
  used: boolean;
  onNavigateHome: () => void;
}): JSX.Element {
  const title = expired ? "Invite expired" : used ? "Invite already used" : "Invite revoked";
  const description = expired
    ? "This invite link has expired. Ask the household admin for a new one."
    : used
      ? "This invite link has already been used."
      : "This invite link is no longer valid.";

  return (
    <div className="space-y-2 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" onClick={onNavigateHome} className="w-full">
        Go Home
      </Button>
    </div>
  );
}

function AlreadyInHouseholdView({
  onNavigateHousehold,
}: {
  onNavigateHousehold: () => void;
}): JSX.Element {
  return (
    <div className="space-y-2 text-center">
      <p className="font-medium">You&apos;re already in a household</p>
      <p className="text-sm text-muted-foreground">
        Leave your current household before joining another.
      </p>
      <Button onClick={onNavigateHousehold} className="w-full">
        View My Household
      </Button>
    </div>
  );
}

function JoinInviteView({
  invite,
  isAuthenticated,
  onSignUp,
  onJoin,
}: {
  invite: InviteData;
  isAuthenticated: boolean;
  onSignUp: () => void;
  onJoin: () => Promise<void>;
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-1 rounded-lg border bg-muted/30 p-4 text-center">
        <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
        <p className="text-lg font-semibold">{invite.householdName}</p>
        {invite.adminName && (
          <p className="text-sm text-muted-foreground">Invited by {invite.adminName}</p>
        )}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Join to share and view electricity meter data together.
      </p>
      {!isAuthenticated ? (
        <Button onClick={onSignUp} className="w-full">
          Sign up to Join
        </Button>
      ) : (
        <Button onClick={() => void onJoin()} className="w-full">
          <Users className="mr-2 h-4 w-4" />
          Join {invite.householdName}
        </Button>
      )}
    </div>
  );
}

export default function InvitePage(): JSX.Element {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const rawInvite = useQuery(api.household.getInviteByCode, code ? { code } : "skip");
  const invite = rawInvite === undefined ? null : (rawInvite as InviteData | null);
  const { joinHousehold, inHousehold, loading: householdLoading } = useHousehold();

  const handleJoin = async () => {
    if (!code) return;
    try {
      await joinHousehold({ code });
      toast.success("Welcome to the household!");
      navigate("/household");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join household";
      toast.error(message);
    }
  };

  const handleSignUp = () => {
    navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
  };

  const isLoading = authLoading || invite === undefined || (isAuthenticated && householdLoading);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const renderContent = () => {
    if (!invite) {
      return <InvalidInviteView onNavigateHome={() => navigate("/")} />;
    }
    if (!invite.valid) {
      return (
        <ExpiredInviteView
          expired={invite.expired}
          used={invite.used}
          onNavigateHome={() => navigate("/")}
        />
      );
    }
    if (isAuthenticated && inHousehold) {
      return <AlreadyInHouseholdView onNavigateHousehold={() => navigate("/household")} />;
    }
    return (
      <JoinInviteView
        invite={invite}
        isAuthenticated={isAuthenticated}
        onSignUp={handleSignUp}
        onJoin={handleJoin}
      />
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEO
        title="Join Household"
        description="You've been invited to join a household on Pretoria Prepaid."
      />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-lg bg-primary/10 p-3">
              <Zap className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pretoria Prepaid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
