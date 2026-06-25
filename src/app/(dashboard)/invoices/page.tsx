import Link from "next/link";
import { CheckCircle, Receipt } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState, Section, Th } from "@/components/admin/section";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
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
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            description="Every fee has been invoiced. New ones appear here as bookings complete under an active contract."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {uninvoiced.map((salon) => (
              <li key={salon.salonId}>
                <Link
                  href={`/salons/${salon.salonId}`}
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-warm-strong"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {salon.salonName}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-soft">
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
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Invoices are created from a salon's uninvoiced fees, one month at a time."
          />
        ) : (
          <Table className="[&_td]:py-3">
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
                      className="font-mono text-[13px] font-semibold tabular-nums text-brand-strong hover:text-brand hover:underline"
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
                  <TableCell className="text-[13px] whitespace-nowrap text-ink-muted">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                    {formatMoney(inv.subtotal)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                    {inv.vatRateBps > 0 ? formatMoney(inv.vatAmount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] font-semibold tabular-nums text-foreground">
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
