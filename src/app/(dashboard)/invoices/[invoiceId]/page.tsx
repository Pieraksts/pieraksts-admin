import { notFound } from "next/navigation";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";

import { InvoiceActions } from "@/components/admin/invoice-actions";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUPPLIER } from "@/lib/config/supplier";
import { getInvoice } from "@/lib/data/salons";
import { formatDate, formatMoney, formatRate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage(
  props: PageProps<"/invoices/[invoiceId]">,
) {
  const { invoiceId } = await props.params;
  const invoice = await getInvoice(invoiceId);
  if (!invoice) notFound();

  const hasVat = invoice.vatRateBps > 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        backHref={`/salons/${invoice.salonId}`}
        backLabel={invoice.salonName}
        eyebrow="Invoice"
        title={invoice.reference}
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Coming soon">
              <DownloadSimple size={14} weight="bold" data-icon="inline-start" />
              Download PDF
            </Button>
            <InvoiceActions invoice={invoice} salonId={invoice.salonId} layout="header" />
          </>
        }
      />

      {/* Summary */}
      <section className="grid gap-4 rounded-xl border border-hairline bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Salon" value={invoice.salonName} />
        <Field
          label="Period"
          value={`${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
        />
        <div>
          <dt className="eyebrow mb-1.5">Status</dt>
          <dd>
            <StatusBadge status={invoice.status} />
          </dd>
        </div>
        <Field
          label="Due"
          value={
            invoice.dueDate
              ? formatDate(invoice.dueDate)
              : invoice.status === "paid"
                ? "Paid"
                : "Not sent yet"
          }
        />
        <Field label="Sent" value={invoice.sentAt ? formatDate(invoice.sentAt) : "—"} />
        <Field label="Paid" value={invoice.paidAt ? formatDate(invoice.paidAt) : "—"} />
        <Field
          label="Supplier"
          value={SUPPLIER.legalName}
          hint={hasVat ? `VAT ${SUPPLIER.vatNumber}` : "Not VAT liable"}
        />
        <Field
          label="Payment term"
          value={`${SUPPLIER.paymentTermDays} days`}
        />
      </section>

      {/* Frozen line items */}
      <section className="overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="border-b border-hairline px-5 py-3.5">
          <h2 className="display-type text-[15px] font-bold tracking-[-0.01em]">
            Line items
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <Th className="pl-5">Date</Th>
              <Th>Service</Th>
              <Th className="text-right">Gross</Th>
              <Th>Rate</Th>
              <Th className="pr-5 text-right">Commission</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map((line) => (
              <TableRow key={line.id} className="border-hairline">
                <TableCell className="pl-5 text-[13px] text-ink-muted">
                  {formatDate(line.bookingDate)}
                </TableCell>
                <TableCell className="text-[13px] text-foreground">
                  {line.serviceName}
                </TableCell>
                <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                  {formatMoney(line.grossAmount)}
                </TableCell>
                <TableCell className="text-[13px] text-ink-muted">
                  {formatRate(line.commissionRateBps)}
                </TableCell>
                <TableCell className="pr-5 text-right font-mono text-[13px] tabular-nums text-foreground">
                  {formatMoney(line.commissionAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="flex flex-col items-end gap-1.5 border-t border-hairline px-5 py-4">
          <TotalRow label="Net commission" value={formatMoney(invoice.subtotal)} />
          {hasVat ? (
            <TotalRow
              label={`VAT (${formatRate(invoice.vatRateBps)})`}
              value={formatMoney(invoice.vatAmount)}
            />
          ) : (
            <p className="text-[12px] text-ink-soft">Not VAT liable — no VAT applied.</p>
          )}
          <TotalRow label="Total" value={formatMoney(invoice.total)} strong />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="eyebrow mb-1.5">{label}</dt>
      <dd className="text-[14px] text-foreground">{value}</dd>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex w-full max-w-xs items-center justify-between gap-6">
      <span
        className={`text-[13px] ${strong ? "font-semibold text-foreground" : "text-ink-muted"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-[14px] tabular-nums ${
          strong ? "font-bold text-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
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
