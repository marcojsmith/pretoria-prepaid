import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2 } from "lucide-react";
import type { HouseholdMember } from "@/types/household";

interface HouseholdMembersListProps {
  members: HouseholdMember[];
  currentUserId: string | undefined;
  isAdmin: boolean;
  onRemove: (userId: string) => void;
}

export function HouseholdMembersList({
  members,
  currentUserId,
  isAdmin,
  onRemove,
}: HouseholdMembersListProps): JSX.Element {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.userId}
          className="flex items-center justify-between rounded-md border p-3"
        >
          <div>
            <p className="text-sm font-medium">
              {member.preferredName ?? member.email ?? "Unknown"}
              {member.userId === currentUserId && (
                <span className="ml-1 text-xs text-muted-foreground">(you)</span>
              )}
            </p>
            {member.preferredName && member.email && (
              <p className="text-xs text-muted-foreground">{member.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {member.role === "admin" && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
            {isAdmin && member.userId !== currentUserId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove member?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {member.preferredName ?? member.email ?? "Unknown"}
                      will lose access to the household data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        void onRemove(member.userId);
                      }}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface HouseholdActionsProps {
  isAdmin: boolean;
  onLeave: () => void;
  onDisband: () => void;
}

export function HouseholdActions({
  isAdmin,
  onLeave,
  onDisband,
}: HouseholdActionsProps): JSX.Element {
  return (
    <>
      {!isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Leave Household
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave household?</AlertDialogTitle>
              <AlertDialogDescription>
                You will lose access to all shared meter data and purchases.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void onLeave();
                }}
              >
                Leave
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isAdmin && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Disband Household
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disband household?</AlertDialogTitle>
              <AlertDialogDescription>
                All members will be removed. This cannot be undone. Your meter data will remain
                intact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void onDisband();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Disband
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
