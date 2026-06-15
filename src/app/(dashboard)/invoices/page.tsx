import Link from "next/link";
import { Receipt } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInvoicesPage } from "@/lib/data/salons";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Invoices · Pieraksts Admin" };

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}

export default async function InvoicesPage() {
  const { invoices, uninvoiced } = await getInvoicesPage();
  const uninvoicedTotal = uninvoiced.reduce((s, u) => s + u.net, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Invoices"
        description="Monthly commission invoices across all salons."
      />

      {/* Uninvoiced fees, grouped by salon and month (stragglers stay visible) */}
      <Section
        title="Uninvoiced fees"
        action={
          uninvoicedTotal > 0 ? (
            <span className="font-mono text-[13px] tabular-nums text-ink-muted">
              {formatMoney(uninvoicedTotal)} net
            </span>
          ) : null
        }
      >
        {uninvoiced.length === 0 ? (
          <div className="px-5 py-8">
            <p className="text-[14px] text-ink-muted">
              No uninvoiced fees. Generate invoices from a salon once it has
              completed-booking fees under an active contract.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {uninvoiced.map((salon) => (
              <li key={salon.salonId}>
                <Link
                  href={`/salons/${salon.salonId}`}
                  className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-warm-strong"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {salon.salonName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-soft">
                      {salon.months
                        .map(
                          (m) =>
                            `${monthLabel(m.month)} (${m.feeCount} ${
                              m.feeCount === 1 ? "fee" : "fees"
                            })`,
                        )
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-foreground">
                    {formatMoney(salon.net)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* All invoices */}
      <Section title="All invoices">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-warm-strong text-brand">
              <Receipt size={24} weight="duotone" />
            </span>
            <p className="max-w-sm text-[14px] leading-6 text-ink-muted">
              No invoices generated yet. They&apos;re created from a salon&apos;s
              uninvoiced fees, one month at a time.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-hairline hover:bg-transparent">
                <Th className="pl-5">Number</Th>
                <Th>Salon</Th>
                <Th>Period</Th>
                <Th className="text-right">Net</Th>
                <Th className="text-right">VAT</Th>
                <Th className="text-right">Total</Th>
                <Th className="pr-5 text-right">Status</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="border-hairline">
                  <TableCell className="pl-5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-mono text-[13px] tabular-nums font-semibold text-brand-strong hover:text-brand hover:underline"
                    >
                      {inv.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[13px] text-foreground">
                    <Link
                      href={`/salons/${inv.salonId}`}
                      className="hover:underline"
                    >
                      {inv.salonName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                    {formatMoney(inv.subtotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                    {inv.vatRateBps > 0 ? formatMoney(inv.vatAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums font-semibold text-foreground">
                    {formatMoney(inv.total)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <StatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <h2 className="display-type text-[15px] font-bold tracking-[-0.01em]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={`h-11 text-[11px] font-semibold tracking-[0.1em] text-ink-soft uppercase ${className}`}
    >
      {children}
    </TableHead>
  );
}
