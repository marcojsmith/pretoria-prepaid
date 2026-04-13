import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { MyHousehold, HouseholdInvite } from "@/types/household";

/**
 * Return type for the useHousehold hook containing household data and mutation functions.
 */
interface UseHouseholdReturn {
  /** The current user's household or null if not in one */
  household: MyHousehold | null;
  /** Pending invites for this household (only visible to admins) */
  invites: HouseholdInvite[] | null | undefined;
  /** Whether household data is loading */
  loading: boolean;
  /** Whether current user is the household admin */
  isAdmin: boolean;
  /** Whether current user is a household member (non-admin) */
  isMember: boolean;
  /** Whether user is in a household */
  inHousehold: boolean;
  /** Mutation to create a new household */
  createHousehold: ReturnType<typeof useMutation<typeof api.household.createHousehold>>;
  /** Mutation to create an invite code */
  createInvite: ReturnType<typeof useMutation<typeof api.household.createInvite>>;
  /** Mutation to revoke an invite */
  revokeInvite: ReturnType<typeof useMutation<typeof api.household.revokeInvite>>;
  /** Mutation to join a household */
  joinHousehold: ReturnType<typeof useMutation<typeof api.household.joinHousehold>>;
  /** Mutation to remove a member */
  removeMember: ReturnType<typeof useMutation<typeof api.household.removeMember>>;
  /** Mutation to leave a household */
  leaveHousehold: ReturnType<typeof useMutation<typeof api.household.leaveHousehold>>;
  /** Mutation to disband a household */
  disbandHousehold: ReturnType<typeof useMutation<typeof api.household.disbandHousehold>>;
}

export function useHousehold(): UseHouseholdReturn {
  const household = useQuery(api.household.getMyHousehold);
  const invites = useQuery(api.household.getMyInvites);
  const createHouseholdMutation = useMutation(api.household.createHousehold);
  const createInviteMutation = useMutation(api.household.createInvite);
  const revokeInviteMutation = useMutation(api.household.revokeInvite);
  const joinHouseholdMutation = useMutation(api.household.joinHousehold);
  const removeMemberMutation = useMutation(api.household.removeMember);
  const leaveHouseholdMutation = useMutation(api.household.leaveHousehold);
  const disbandHouseholdMutation = useMutation(api.household.disbandHousehold);

  return {
    household: household ?? null,
    invites,
    loading: household === undefined || invites === undefined,
    isAdmin: household?.myRole === "admin",
    isMember: household?.myRole === "member",
    inHousehold: !!household,
    createHousehold: createHouseholdMutation,
    createInvite: createInviteMutation,
    revokeInvite: revokeInviteMutation,
    joinHousehold: joinHouseholdMutation,
    removeMember: removeMemberMutation,
    leaveHousehold: leaveHouseholdMutation,
    disbandHousehold: disbandHouseholdMutation,
  };
}
