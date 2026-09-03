import { useState } from "react";
import { Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { HouseholdMeter } from "@/types/household";
import { useMeters, type ListedMeter } from "@/hooks/useMeters";
import type { Id } from "../../convex/_generated/dataModel";

interface MeterManagementCardProps {
  householdId: Id<"households">;
  meters: HouseholdMeter[];
  isAdmin: boolean;
}

/**
 * Household "Meters" card: lists non-archived meters for the current
 * household, and — admin only — offers add/edit/archive controls. Non-admin
 * members see a read-only list, matching the existing member-list pattern.
 */
export function MeterManagementCard({
  householdId,
  meters,
  isAdmin,
}: MeterManagementCardProps): JSX.Element {
  const { meters: myMeters, addMeter, updateMeter, archiveMeter } = useMeters();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Meters</CardTitle>
        <CardDescription>Meters attached to this household.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {meters.length === 0 && <p className="text-sm text-muted-foreground">No meters yet.</p>}
        {meters.map((meter) => (
          <MeterListItem
            key={meter.meterId}
            meter={meter}
            fullMeter={myMeters?.find((m) => m.meterId === meter.meterId)}
            isAdmin={isAdmin}
            onUpdate={updateMeter}
            onArchive={archiveMeter}
          />
        ))}
        {isAdmin && <AddMeterForm householdId={householdId} onAdd={addMeter} />}
      </CardContent>
    </Card>
  );
}

interface MeterListItemProps {
  meter: HouseholdMeter;
  fullMeter: ListedMeter | undefined;
  isAdmin: boolean;
  onUpdate: ReturnType<typeof useMeters>["updateMeter"];
  onArchive: ReturnType<typeof useMeters>["archiveMeter"];
}

function MeterListItem({
  meter,
  fullMeter,
  isAdmin,
  onUpdate,
  onArchive,
}: MeterListItemProps): JSX.Element {
  const [busy, setBusy] = useState(false);

  const handleArchive = () => {
    if (busy) return;
    setBusy(true);
    void onArchive(meter.meterId as Id<"meters">).finally(() => setBusy(false));
  };

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{meter.name}</p>
        {meter.meterNumber && <p className="text-xs text-muted-foreground">{meter.meterNumber}</p>}
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1">
          <EditMeterDialog meter={meter} fullMeter={fullMeter} onUpdate={onUpdate} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={busy}
                aria-label={`Archive meter ${meter.name}`}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive meter?</AlertDialogTitle>
                <AlertDialogDescription>
                  {meter.name} will be hidden from the meter switcher and household members using it
                  as their active meter will need to pick another one.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

interface EditMeterDialogProps {
  meter: HouseholdMeter;
  fullMeter: ListedMeter | undefined;
  onUpdate: ReturnType<typeof useMeters>["updateMeter"];
}

function EditMeterDialog({ meter, fullMeter, onUpdate }: EditMeterDialogProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(meter.name);
  const [meterNumber, setMeterNumber] = useState(meter.meterNumber ?? "");
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(
    fullMeter?.lowBalanceThreshold?.toString() ?? ""
  );
  const [defaultDailyUsage, setDefaultDailyUsage] = useState(
    fullMeter?.defaultDailyUsage?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        meterId: meter.meterId as Id<"meters">,
        name,
        ...(meterNumber ? { meterNumber } : {}),
        ...(lowBalanceThreshold ? { lowBalanceThreshold: parseFloat(lowBalanceThreshold) } : {}),
        ...(defaultDailyUsage ? { defaultDailyUsage: parseFloat(defaultDailyUsage) } : {}),
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Edit meter ${meter.name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit meter</DialogTitle>
          <DialogDescription>Update this meter's name, number, and thresholds.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="meter-edit-name">Name</Label>
            <Input id="meter-edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-edit-number">Meter Number</Label>
            <Input
              id="meter-edit-number"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-edit-threshold">Low Balance Threshold (kWh)</Label>
            <Input
              id="meter-edit-threshold"
              type="number"
              value={lowBalanceThreshold}
              onChange={(e) => setLowBalanceThreshold(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meter-edit-usage">Default Daily Usage (kWh)</Label>
            <Input
              id="meter-edit-usage"
              type="number"
              value={defaultDailyUsage}
              onChange={(e) => setDefaultDailyUsage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleSave()} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddMeterFormProps {
  householdId: Id<"households">;
  onAdd: ReturnType<typeof useMeters>["addMeter"];
}

function AddMeterForm({ householdId, onAdd }: AddMeterFormProps): JSX.Element {
  const [name, setName] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await onAdd({ householdId, name, ...(meterNumber ? { meterNumber } : {}) });
      setName("");
      setMeterNumber("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label htmlFor="new-meter-name" className="text-sm font-medium">
        Add Meter
      </Label>
      <Input
        id="new-meter-name"
        placeholder="Meter name (e.g. Garden Cottage)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="Meter number (optional)"
        value={meterNumber}
        onChange={(e) => setMeterNumber(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={adding || !name.trim()}
        onClick={() => void handleAdd()}
      >
        <Plus className="mr-2 h-4 w-4" />
        {adding ? "Adding..." : "Add Meter"}
      </Button>
    </div>
  );
}
