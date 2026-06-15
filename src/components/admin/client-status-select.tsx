"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setClientStatus,
  setVisibility,
  terminateContract,
} from "@/lib/actions/salons";
import type { ClientStatus, Contract } from "@/lib/data/salons";

const OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "terminated", label: "Terminated" },
];

export function ClientStatusSelect({
  salonId,
  status,
  activeContract,
  isPublic,
}: {
  salonId: string;
  status: ClientStatus;
  activeContract: Contract | null;
  isPublic: boolean;
}) {
  const [value, setValue] = useState<ClientStatus>(status);
  const [pending, startTransition] = useTransition();
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [alsoTerminate, setAlsoTerminate] = useState(false);
  const [alsoHide, setAlsoHide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyStatus(next: ClientStatus, extra?: () => Promise<void>) {
    const previous = value;
    setValue(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        await setClientStatus(salonId, next);
        if (extra) await extra();
        setCascadeOpen(false);
      } catch {
        setValue(previous); // revert
        setError("Could not update. Please try again.");
      }
    });
  }

  function onChange(nextRaw: string) {
    const next = nextRaw as ClientStatus;
    if (next === "terminated") {
      // Never silent — confirm the cascade (docs/product-decisions.md).
      setAlsoTerminate(Boolean(activeContract));
      setAlsoHide(isPublic);
      setError(null);
      setCascadeOpen(true);
      return;
    }
    applyStatus(next);
  }

  function confirmTerminate() {
    applyStatus("terminated", async () => {
      if (alsoTerminate && activeContract) {
        await terminateContract(salonId, activeContract.id);
      }
      if (alsoHide) await setVisibility(salonId, false);
    });
  }

  return (
    <>
      <Select value={value} onValueChange={onChange} disabled={pending}>
        <SelectTrigger size="sm" aria-label="Client status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog
        open={cascadeOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCascadeOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate this client?</DialogTitle>
            <DialogDescription>
              Sets the client status to Terminated. Choose what else to do —
              billing only stops if the contract is terminated.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2.5 text-[14px] text-foreground">
            {activeContract ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={alsoTerminate}
                  onChange={(e) => setAlsoTerminate(e.target.checked)}
                />
                Also terminate the active contract (v{activeContract.version})
              </label>
            ) : null}
            {isPublic ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-brand"
                  checked={alsoHide}
                  onChange={(e) => setAlsoHide(e.target.checked)}
                />
                Also hide this salon from the app
              </label>
            ) : null}
            {!activeContract && !isPublic ? (
              <p className="text-ink-muted">
                No active contract, and the salon is already hidden — nothing
                else to change.
              </p>
            ) : null}
          </div>
          {error ? (
            <p className="text-[13px] text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={confirmTerminate}
            >
              {pending ? "Terminating…" : "Terminate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
