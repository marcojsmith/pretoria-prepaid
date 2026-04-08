import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NavMenu } from "@/components/NavMenu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, LogOut, ArrowLeft, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  offlineCount?: number;
}

const DASHBOARD_PATH = "/dashboard";
const SETTINGS_PATH = "/settings";

type UserMenuUser = {
  imageUrl?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
};

function UserMenuItems({
  user,
  onSignOut,
  onNavigateToSettings,
}: {
  user: UserMenuUser;
  onSignOut: () => void;
  onNavigateToSettings: () => void;
}): JSX.Element {
  return (
    <DropdownMenuContent className="w-56" align="end" forceMount>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">{user.fullName}</p>
          <p className="text-xs leading-none text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onNavigateToSettings} className="cursor-pointer">
        <User className="mr-2 h-4 w-4" />
        <span>Profile Settings</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onSignOut}
        className="cursor-pointer text-destructive focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function UserMenu({ user, onSignOut }: { user: UserMenuUser; onSignOut: () => void }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.imageUrl ?? undefined} alt={user.fullName || "User"} />
            <AvatarFallback>
              {user.firstName?.charAt(0) || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <UserMenuItems
        user={user}
        onSignOut={onSignOut}
        onNavigateToSettings={() => navigate(SETTINGS_PATH)}
      />
    </DropdownMenu>
  );
}

export function Header({ offlineCount = 0 }: HeaderProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const isMainEntryPage = location.pathname === DASHBOARD_PATH || location.pathname === "/";

  const handleSignOut = () => {
    void (async () => {
      try {
        await signOut();
        navigate("/auth");
      } catch (error) {
        console.error("Sign out failed:", error);
        toast({
          title: "Sign out failed",
          description: "There was a problem signing you out. Please try again.",
          variant: "destructive",
        });
      }
    })();
  };

  return (
    <header className="no-print sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <NavMenu offlineCount={offlineCount} />
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-sm px-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => navigate(DASHBOARD_PATH)}
            aria-label="PowerTracker Home"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold sm:text-sm">PowerTracker</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isMainEntryPage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-[10px] sm:text-xs"
              onClick={() => navigate(DASHBOARD_PATH)}
            >
              <ArrowLeft className="h-3 w-3" />
              <span className="xs:inline hidden">Dashboard</span>
            </Button>
          )}

          <ThemeToggle />

          {user && <UserMenu user={user} onSignOut={handleSignOut} />}
        </div>
      </div>
    </header>
  );
}
