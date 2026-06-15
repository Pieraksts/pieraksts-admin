"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt } from "@phosphor-icons/react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateInvoice } from "@/lib/actions/invoices";
import type { BookingFee } from "@/lib/data/salons";
import { formatMoney } from "@/lib/format";

/** Round to euro cents the same way the DB does (round-half-up at 2 dp). */
function roundEuro(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** YYYY-MM of the previous calendar month (the default to invoice). */
function lastMonthYM(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}

/** First and last day (YYYY-MM-DD) of a YYYY-MM month. */
function monthBounds(ym: string): { start: string; end: string } {
  const [y, m] = ym.split("-").map(Number);
  return {
    start: `${ym}-01`,
    end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10),
  };
}

function monthLabel(ym: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${ym}-01T00:00:00Z`));
}

export function GenerateInvoice({
  salonId,
  uninvoicedFees,
  vatRateBps,
  vatRegistered,
}: {
  salonId: string;
  uninvoicedFees: BookingFee[];
  vatRateBps: number;
  vatRegistered: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ym, setYm] = useState(lastMonthYM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Preview the selected month entirely from the already-loaded uninvoiced fees,
  // so the numbers match before any DB round-trip.
  const preview = useMemo(() => {
    const inMonth = uninvoicedFees.filter((f) => f.bookingDate.slice(0, 7) === ym);
    const net = roundEuro(inMonth.reduce((s, f) => s + f.commissionAmount, 0));
    const vat = roundEuro((net * vatRateBps) / 10000);
    return { count: inMonth.length, net, vat, total: roundEuro(net + vat) };
  }, [uninvoicedFees, ym, vatRateBps]);

  const hasFees = preview.count > 0;

  function confirm() {
    setError(null);
    const { start, end } = monthBounds(ym);
    startTransition(async () => {
      try {
        await generateInvoice(salonId, start, end);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error && err.message.includes("INVOICE_NO_FEES")
            ? "No uninvoiced fees for that month — nothing to invoice."
            : "Could not generate the invoice. Please try again.",
        );
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Receipt size={14} weight="bold" data-icon="inline-start" />
        Generate invoice
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate monthly invoice</DialogTitle>
            <DialogDescription>
              Invoices one calendar month of uninvoiced fees. Creates a draft,
              freezes the line items, assigns the next invoice number, and marks
              those fees invoiced.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="invoice-month">Month</Label>
            <Input
              id="invoice-month"
              type="month"
              value={ym}
              max={lastMonthYM()}
              onChange={(e) => setYm(e.target.value || lastMonthYM())}
            />
          </div>

          <div className="rounded-lg border border-hairline bg-warm p-4">
            <p className="eyebrow mb-2">{monthLabel(ym)}</p>
            {hasFees ? (
              <p className="text-[14px] text-foreground">
                <span className="font-semibold">
                  {preview.count} {preview.count === 1 ? "fee" : "fees"}
                </span>
                ,{" "}
                <span className="font-mono tabular-nums">
                  {formatMoney(preview.net)}
                </span>{" "}
                net
                {vatRegistered ? (
                  <>
                    {" + "}
                    <span className="font-mono tabular-nums">
                      {formatMoney(preview.vat)}
                    </span>{" "}
                    VAT
                  </>
                ) : null}{" "}
                ={" "}
                <span className="font-mono font-semibold tabular-nums">
                  {formatMoney(preview.total)}
                </span>
                {!vatRegistered ? (
                  <span className="mt-1 block text-[12px] text-ink-soft">
                    Not VAT liable — no VAT applied.
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="text-[14px] text-ink-muted">
                No uninvoiced fees in {monthLabel(ym)}.
              </p>
            )}
          </div>

          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={confirm} disabled={!hasFees || pending}>
              {pending
                ? "Generating…"
                : `Generate ${formatMoney(preview.total)} invoice`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
