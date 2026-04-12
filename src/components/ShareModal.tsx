import { useState } from "react";
import { Copy, Check, Link } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useHousehold } from "@/hooks/useHousehold";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ open, onOpenChange }: ShareModalProps): JSX.Element {
  const { createInvite } = useHousehold();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const COPY_FEEDBACK_DURATION_MS = 2000;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const code = await createInvite();
      const url = `${window.location.origin}/invite/${code}`;
      setInviteUrl(url);
    } catch (error) {
      console.error("Failed to generate invite link", error);
      toast.error("Failed to generate invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setInviteUrl(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Someone</DialogTitle>
          <DialogDescription>
            Generate a link and share it. Valid for 7 days, single use.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!inviteUrl ? (
            <Button onClick={() => void handleGenerate()} disabled={loading} className="w-full">
              <Link className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Generate Invite Link"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                <p className="flex-1 truncate font-mono text-sm">{inviteUrl}</p>
                <Button size="sm" variant="outline" onClick={() => void handleCopy()}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days and can only be used once.
              </p>
              <Button
                variant="outline"
                onClick={() => void handleGenerate()}
                disabled={loading}
                className="w-full"
              >
                Generate Another Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
