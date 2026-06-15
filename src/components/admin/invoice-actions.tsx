"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  cancelInvoice,
  markInvoicePaid,
  markInvoiceSent,
} from "@/lib/actions/invoices";
import type { Invoice } from "@/lib/data/salons";
import { formatMoney } from "@/lib/format";

type Action = "sent" | "paid" | "cancel";

const COPY: Record<
  Action,
  { title: (ref: string) => string; body: string; cta: string; busy: string; destructive?: boolean }
> = {
  sent: {
    title: (ref) => `Mark ${ref} as sent?`,
    body: "Stamps the sent date and starts the 14-day payment term. After the term passes unpaid it shows as overdue.",
    cta: "Mark as sent",
    busy: "Marking…",
  },
  paid: {
    title: (ref) => `Mark ${ref} as paid?`,
    body: "Stamps the paid date and closes the invoice. This is the final state.",
    cta: "Mark as paid",
    busy: "Marking…",
  },
  cancel: {
    title: (ref) => `Cancel ${ref}?`,
    body: "Releases its fees back to uninvoiced so they can be re-invoiced later. The cancelled invoice and its number are kept as a record.",
    cta: "Cancel invoice",
    busy: "Cancelling…",
    destructive: true,
  },
};

/**
 * Lifecycle controls for one invoice. `size="row"` is the compact form used in
 * tables; the default is the larger form for the breakdown header. Every change
 * is confirmed with a dialog that names its effect (no silent changes).
 */
export function InvoiceActions({
  invoice,
  salonId,
  layout = "row",
}: {
  invoice: Invoice;
  salonId: string;
  layout?: "row" | "header";
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Derived 'overdue' is still a 'sent' invoice underneath.
  const isSent = invoice.status === "sent" || invoice.status === "overdue";
  const isDraft = invoice.status === "draft";

  if (!isDraft && !isSent) {
    return layout === "row" ? (
      <span className="text-[13px] text-ink-soft">—</span>
    ) : null;
  }

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        setAction(null);
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  function perform() {
    if (action === "sent") run(() => markInvoiceSent(invoice.id, salonId));
    else if (action === "paid") run(() => markInvoicePaid(invoice.id, salonId));
    else if (action === "cancel") run(() => cancelInvoice(invoice.id, salonId));
  }

  const size = layout === "row" ? "sm" : "default";
  const copy = action ? COPY[action] : null;

  return (
    <>
      <div className="inline-flex items-center gap-2">
        {isDraft ? (
          <Button size={size} onClick={() => setAction("sent")}>
            Mark sent
          </Button>
        ) : (
          <Button size={size} onClick={() => setAction("paid")}>
            Mark paid
          </Button>
        )}
        <Button variant="outline" size={size} onClick={() => setAction("cancel")}>
          Cancel
        </Button>
      </div>

      <Dialog
        open={action !== null}
        onOpenChange={(next) => {
          if (!next) {
            setAction(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          {copy ? (
            <>
              <DialogHeader>
                <DialogTitle>{copy.title(invoice.reference)}</DialogTitle>
                <DialogDescription>
                  {copy.body}{" "}
                  {action !== "cancel"
                    ? `Amount due: ${formatMoney(invoice.total)}.`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p className="text-[13px] text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={pending}>
                    {action === "cancel" ? "Keep invoice" : "Cancel"}
                  </Button>
                </DialogClose>
                <Button
                  variant={copy.destructive ? "destructive" : "default"}
                  disabled={pending}
                  onClick={perform}
                >
                  {pending ? copy.busy : copy.cta}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
