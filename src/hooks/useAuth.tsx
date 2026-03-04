import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, createContext, useContext, ReactNode } from "react";

interface AuthContextType {
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerkAuth();
  const syncUser = useMutation(api.users.syncUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      syncUser({ email: user.primaryEmailAddress?.emailAddress ?? null });
    }
  }, [isLoaded, isSignedIn, user, syncUser]);

  return (
    <AuthContext.Provider value={{ user, loading: !isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
