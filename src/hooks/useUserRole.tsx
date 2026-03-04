import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useUserRole() {
  const role = useQuery(api.users.getRole);

  return {
    isAdmin: role === "admin",
    loading: role === undefined,
  };
}
