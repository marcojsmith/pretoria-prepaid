import { createContext } from "react";
import type { useUser } from "@clerk/clerk-react";

export interface AuthContextType {
  user: ReturnType<typeof useUser>["user"];
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
