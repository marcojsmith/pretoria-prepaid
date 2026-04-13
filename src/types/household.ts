export interface HouseholdMember {
  userId: string;
  role: "admin" | "member";
  joinedAt?: number;
  preferredName: string | null;
  email: string | null;
}

export interface MyHousehold {
  householdId: string;
  name: string;
  adminUserId: string;
  myRole: "admin" | "member";
  members: HouseholdMember[];
}

export interface InviteData {
  valid: boolean;
  expired: boolean;
  used: boolean;
  revoked: boolean;
  householdName: string | null;
  adminName: string | null;
}

/** Invitation record for household invites */
export interface HouseholdInvite {
  _id: string;
  householdId: string;
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  usedBy?: string;
  usedAt?: number;
  revoked?: boolean;
}
