import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useProfile() {
  const profile = useQuery(api.users.getProfile);
  const updateProfile = useMutation(api.users.updateProfile);

  return {
    profile,
    updateProfile,
    loading: profile === undefined,
  };
}
