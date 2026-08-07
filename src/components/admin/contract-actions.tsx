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
import { terminateContract } from "@/lib/actions/salons";
import type { Contract } from "@/lib/data/salons";

/**
 * `SUB-1` retired the commission/contract model as the launch commercial path,
 * so there is no longer an Activate action: a Salon's commercial relationship
 * is the provider-neutral Business Subscription. Terminate remains so a legacy
 * contract left over from the old model can be wound down.
 */
export function ContractActions({
  salonId,
  contract,
}: {
  salonId: string;
  contract: Contract;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (contract.status !== "active") {
    return <span className="text-[13px] text-ink-soft">—</span>;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>
        Terminate
      </Button>

      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate v{contract.version}?</DialogTitle>
            <DialogDescription>
              This closes a legacy commission contract. It does not change the
              Salon&rsquo;s Business Subscription or its entitlement. Past fees
              and invoices are unaffected.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await terminateContract(salonId, contract.id);
                    setConfirm(false);
                  } catch {
                    setError("Something went wrong. Please try again.");
                  }
                });
              }}
            >
              {pending ? "Terminating…" : "Terminate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
