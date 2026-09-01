import { useState, useRef, useEffect } from "react";
import { Pencil, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { roundUnits } from "@/lib/electricity";
import { InfoTip } from "@/components/InfoTip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TEXT_DESTRUCTIVE = "text-destructive";

interface EditableBalanceProps {
  estimatedBalance: number;
  isLow: boolean;
  lowBalanceThreshold: number;
  onUpdateBalance: (value: number) => Promise<void>;
}

/**
 * Est. Balance stat with an inline edit affordance — click the pencil to enter
 * the actual meter reading, then confirm on blur before it's saved as a
 * manual correction. Cancelling discards the edit and keeps the estimate.
 */
export function EditableBalance({
  estimatedBalance,
  isLow,
  lowBalanceThreshold,
  onUpdateBalance,
}: EditableBalanceProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const skipConfirmRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEditing() {
    setDraft(roundUnits(estimatedBalance).toString());
    setEditing(true);
  }

  function handleBlur() {
    if (skipConfirmRef.current) {
      // Blur triggered by clicking a dialog button — let its own handler run.
      skipConfirmRef.current = false;
      return;
    }
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      setEditing(false);
      return;
    }
    if (roundUnits(parsed) === roundUnits(estimatedBalance)) {
      setEditing(false);
      return;
    }
    setPendingValue(parsed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      skipConfirmRef.current = true;
      setEditing(false);
    }
  }

  async function handleConfirm() {
    if (pendingValue === null) return;
    setSaving(true);
    try {
      await onUpdateBalance(pendingValue);
    } finally {
      setSaving(false);
      setPendingValue(null);
      setEditing(false);
    }
  }

  function handleCancel() {
    setPendingValue(null);
    setEditing(false);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Zap className={`h-3.5 w-3.5 ${isLow ? TEXT_DESTRUCTIVE : "text-primary"}`} />
        <span>Est. Balance</span>
        <InfoTip text="Meter reading after your last purchase, minus estimated consumption since then (daily usage × days elapsed). Tap the pencil to correct it against your actual meter." />
        {!editing && (
          <button
            type="button"
            aria-label="Edit meter balance"
            className="text-muted-foreground hover:text-foreground"
            onClick={startEditing}
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        {editing ? (
          <Input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-8 w-24 text-lg font-bold"
            aria-label="Actual meter reading (kWh)"
          />
        ) : (
          <p
            className={`text-lg font-bold tracking-tight ${isLow ? TEXT_DESTRUCTIVE : "text-foreground"}`}
          >
            {roundUnits(estimatedBalance)}{" "}
            <span className="text-xs font-normal text-muted-foreground">kWh</span>
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">Threshold: {lowBalanceThreshold} kWh</p>
      </div>

      <AlertDialog
        open={pendingValue !== null}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update meter balance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set your meter balance to{" "}
              {pendingValue !== null ? roundUnits(pendingValue) : ""} kWh based on your actual meter
              reading. Future usage estimates will be calculated from this value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void handleConfirm()}>
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
