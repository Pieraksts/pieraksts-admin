"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info } from "@phosphor-icons/react";

import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createContract } from "@/lib/actions/salons";
import { formatDate, formatRate } from "@/lib/format";

type DraftStatus = "draft" | "pending_signature";

export function ContractForm({
  salonId,
  salonName,
  nextVersion,
  defaultRatePercent,
}: {
  salonId: string;
  salonName: string;
  nextVersion: number;
  defaultRatePercent: string;
}) {
  const [ratePercent, setRatePercent] = useState(defaultRatePercent);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<DraftStatus>("draft");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const rateError = useMemo(() => {
    if (ratePercent === "") return null;
    const n = Number(ratePercent);
    if (Number.isNaN(n) || n < 0 || n > 100) return "Enter a rate between 0 and 100.";
    return null;
  }, [ratePercent]);

  const dateError = useMemo(() => {
    if (startDate && endDate && endDate < startDate)
      return "End date must be after the start date.";
    return null;
  }, [startDate, endDate]);

  const valid =
    ratePercent !== "" && startDate !== "" && !rateError && !dateError;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    startTransition(async () => {
      try {
        await createContract(salonId, {
          commissionRateBps: Math.round(Number(ratePercent) * 100),
          startDate,
          endDate: endDate || null,
          status,
        });
        router.push(`/salons/${salonId}`);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error &&
            err.message.includes("LEGAL_PROFILE_INCOMPLETE")
            ? "The legal profile is incomplete — go back and complete it first."
            : "Could not create the contract. Please try again.",
        );
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-xl border border-hairline bg-card p-6 lg:col-span-3"
        noValidate
      >
        <div className="grid gap-2">
          <Label htmlFor="rate">
            Commission rate <span className="text-brand">*</span>
          </Label>
          <div className="relative">
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.1"
              value={ratePercent}
              onChange={(e) => setRatePercent(e.target.value)}
              aria-invalid={Boolean(rateError)}
              aria-describedby="rate-help"
              className="pr-8"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] text-ink-soft">
              %
            </span>
          </div>
          <p id="rate-help" className="text-[12px] text-ink-soft">
            {rateError ?? "Percent of each completed booking taken as commission."}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="start">
              Start date <span className="text-brand">*</span>
            </Label>
            <DatePicker
              id="start"
              value={startDate}
              onChange={setStartDate}
              ariaInvalid={Boolean(dateError)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">End date</Label>
            <DatePicker
              id="end"
              value={endDate}
              onChange={setEndDate}
              min={startDate || undefined}
              clearable
              placeholder="Open-ended"
              ariaInvalid={Boolean(dateError)}
            />
          </div>
        </div>
        {dateError ? (
          <p className="-mt-3 text-[12px] text-destructive">{dateError}</p>
        ) : (
          <p className="-mt-3 text-[12px] text-ink-soft">
            Leave the end date empty for an open-ended contract.
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="status">Initial status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as DraftStatus)}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_signature">
                Pending signature
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-warm-strong px-3 py-2.5 text-[12px] text-ink-muted">
          <Info size={15} weight="duotone" className="shrink-0 text-brand" />
          New versions never overwrite past terms — the previous contract is kept
          as history.
        </div>

        {error ? (
          <p className="text-[13px] text-destructive">{error}</p>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={!valid || pending}>
            {pending ? "Creating…" : "Create contract"}
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/salons/${salonId}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      {/* Live summary */}
      <aside className="lg:col-span-2">
        <div className="rounded-xl border border-hairline bg-warm p-5">
          <p className="eyebrow mb-3">Draft summary</p>
          <dl className="flex flex-col gap-3">
            <SummaryRow label="Salon" value={salonName} />
            <SummaryRow label="Version" value={`v${nextVersion}`} mono />
            <SummaryRow
              label="Commission"
              value={
                ratePercent && !rateError
                  ? formatRate(Math.round(Number(ratePercent) * 100))
                  : "—"
              }
              mono
            />
            <SummaryRow
              label="Start"
              value={startDate ? formatDate(startDate) : "—"}
            />
            <SummaryRow
              label="End"
              value={endDate ? formatDate(endDate) : "Open-ended"}
            />
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-ink-muted">Status</dt>
              <dd>
                <StatusBadge status={status} />
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd
        className={`text-[13px] font-medium text-foreground ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
