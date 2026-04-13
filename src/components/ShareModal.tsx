import { useState, useRef, useEffect } from "react";
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
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const COPY_FEEDBACK_DURATION_MS = 2000;

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

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
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setInviteUrl(null);
      setCopied(false);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Invite Someone</DialogTitle>
          <DialogDescription>
            Generate a link and share it. Valid for 7 days, single use.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0 space-y-4">
          {!inviteUrl ? (
            <Button onClick={() => void handleGenerate()} disabled={loading} className="w-full">
              <Link className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Generate Invite Link"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border bg-muted/50 p-2 sm:p-3">
                <p className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">{inviteUrl}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCopy()}
                  className="shrink-0"
                  aria-label="Copy invite link"
                >
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
