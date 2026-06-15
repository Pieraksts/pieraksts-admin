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
import { activateContract, terminateContract } from "@/lib/actions/salons";
import type { Contract } from "@/lib/data/salons";
import { formatDate } from "@/lib/format";

/** YYYY-MM-DD one day before the given ISO date (for the activate message). */
function isoDayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function ContractActions({
  salonId,
  contract,
  activeContract,
}: {
  salonId: string;
  contract: Contract;
  activeContract: Contract | null;
}) {
  const [confirm, setConfirm] = useState<null | "activate" | "terminate">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (contract.status === "terminated") {
    return <span className="text-[13px] text-ink-soft">—</span>;
  }

  const isActive = contract.status === "active";
  const priorActive =
    activeContract && activeContract.id !== contract.id ? activeContract : null;

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setConfirm(null);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <>
      {isActive ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirm("terminate")}
        >
          Terminate
        </Button>
      ) : (
        <Button size="sm" onClick={() => setConfirm("activate")}>
          Activate
        </Button>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          {confirm === "activate" ? (
            <>
              <DialogHeader>
                <DialogTitle>Activate v{contract.version}?</DialogTitle>
                <DialogDescription>
                  {priorActive
                    ? `This terminates the current active contract (v${priorActive.version}), effective ${formatDate(
                        isoDayBefore(contract.startDate),
                      )} — the day before v${contract.version} starts. Billing switches to the new terms.`
                    : `Billing turns on: completed bookings from ${formatDate(
                        contract.startDate,
                      )} onward will accrue commission.`}
                </DialogDescription>
              </DialogHeader>
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
                  disabled={pending}
                  onClick={() =>
                    run(() => activateContract(salonId, contract.id))
                  }
                >
                  {pending ? "Activating…" : `Activate v${contract.version}`}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Terminate v{contract.version}?</DialogTitle>
                <DialogDescription>
                  Billing stops — completed bookings will no longer accrue
                  commission. Past fees and invoices are unaffected.
                </DialogDescription>
              </DialogHeader>
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
                  onClick={() =>
                    run(() => terminateContract(salonId, contract.id))
                  }
                >
                  {pending ? "Terminating…" : "Terminate"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
