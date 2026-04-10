import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AuthContext } from "./AuthContextTypes";

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const { isLoaded, isSignedIn, user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useClerkAuth();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !isAuthenticated) {
      return;
    }
    const args: {
      email: string | null;
      preferredName?: string;
    } = {
      email: user.primaryEmailAddress?.emailAddress ?? null,
    };
    if (user.firstName) {
      args.preferredName = user.firstName;
    }
    syncUser(args).catch((err) => {
      console.error("syncUser failed:", err);
      toast.error("Session sync failed. Some features may be unavailable.");
    });
  }, [isLoaded, isSignedIn, user, isAuthenticated, syncUser]);

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
