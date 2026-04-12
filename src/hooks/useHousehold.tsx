import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface HouseholdMember {
  userId: string;
  role: "admin" | "member";
  joinedAt?: number;
  preferredName: string | null;
  email: string | null;
}

interface MyHousehold {
  householdId: string;
  name: string;
  adminUserId: string;
  myRole: "admin" | "member";
  members: HouseholdMember[];
}

interface UseHouseholdReturn {
  household: MyHousehold | null;
  invites: unknown;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
  inHousehold: boolean;
  createHousehold: ReturnType<typeof useMutation<typeof api.household.createHousehold>>;
  createInvite: ReturnType<typeof useMutation<typeof api.household.createInvite>>;
  revokeInvite: ReturnType<typeof useMutation<typeof api.household.revokeInvite>>;
  joinHousehold: ReturnType<typeof useMutation<typeof api.household.joinHousehold>>;
  removeMember: ReturnType<typeof useMutation<typeof api.household.removeMember>>;
  leaveHousehold: ReturnType<typeof useMutation<typeof api.household.leaveHousehold>>;
  disbandHousehold: ReturnType<typeof useMutation<typeof api.household.disbandHousehold>>;
}

export function useHousehold(): UseHouseholdReturn {
  const household = useQuery(api.household.getMyHousehold) as MyHousehold | null;
  const invites = useQuery(api.household.getMyInvites);
  const createHouseholdMutation = useMutation(api.household.createHousehold);
  const createInviteMutation = useMutation(api.household.createInvite);
  const revokeInviteMutation = useMutation(api.household.revokeInvite);
  const joinHouseholdMutation = useMutation(api.household.joinHousehold);
  const removeMemberMutation = useMutation(api.household.removeMember);
  const leaveHouseholdMutation = useMutation(api.household.leaveHousehold);
  const disbandHouseholdMutation = useMutation(api.household.disbandHousehold);

  return {
    household,
    invites,
    loading: household === undefined,
    isAdmin: household?.myRole === "admin",
    isMember: household?.myRole === "member",
    inHousehold: household !== null && household !== undefined,
    createHousehold: createHouseholdMutation,
    createInvite: createInviteMutation,
    revokeInvite: revokeInviteMutation,
    joinHousehold: joinHouseholdMutation,
    removeMember: removeMemberMutation,
    leaveHousehold: leaveHouseholdMutation,
    disbandHousehold: disbandHouseholdMutation,
  };
}
