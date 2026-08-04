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
  terminateContract,
} from "@/lib/actions/salons";
import type { ClientStatus, Contract } from "@/lib/data/salons";

const OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "terminated", label: "Terminated" },
];

/**
 * `RDY-1`: the commercial client status no longer writes marketplace
 * visibility. Publication is derived from owner intent, Publication Readiness,
 * and entitlement, and the only admin override is Moderation Suspension, which
 * lives in its own control. Terminating a client is a commercial decision, not
 * a moderation action. (The commission/contract model itself is replaced in
 * `SUB-1`; only the visibility coupling is removed here.)
 */
export function ClientStatusSelect({
  salonId,
  status,
  activeContract,
}: {
  salonId: string;
  status: ClientStatus;
  activeContract: Contract | null;
}) {
  const [value, setValue] = useState<ClientStatus>(status);
  const [pending, startTransition] = useTransition();
  const [cascadeOpen, setCascadeOpen] = useState(false);
  const [alsoTerminate, setAlsoTerminate] = useState(false);
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
            {!activeContract ? (
              <p className="text-ink-muted">
                No active contract — nothing else to change. Marketplace
                visibility is not affected; use Suspend for moderation.
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
