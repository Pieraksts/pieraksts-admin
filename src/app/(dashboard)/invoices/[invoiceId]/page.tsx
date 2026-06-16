import { notFound } from "next/navigation";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";

import { InvoiceActions } from "@/components/admin/invoice-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Field, Th, TotalRow } from "@/components/admin/section";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
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

  // Headline figure adapts to the lifecycle stage it's read in.
  const headline =
    invoice.status === "paid"
      ? { label: "Total paid", detail: `Paid ${formatDate(invoice.paidAt)}` }
      : invoice.status === "cancelled"
        ? { label: "Invoice total", detail: "Cancelled — fees released" }
        : invoice.dueDate
          ? { label: "Amount due", detail: `Due ${formatDate(invoice.dueDate)}` }
          : { label: "Amount due", detail: "Not sent yet" };

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
            <InvoiceActions
              invoice={invoice}
              salonId={invoice.salonId}
              layout="header"
            />
          </>
        }
      />

      {/* Summary — amount due leads, supplier reads like an invoice header */}
      <section className="rounded-xl border border-hairline bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow mb-2">{headline.label}</p>
            <p className="font-mono text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums text-foreground sm:text-[36px]">
              {formatMoney(invoice.total)}
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-ink-muted">
              <StatusBadge status={invoice.status} />
              <span aria-hidden>·</span>
              <span>{headline.detail}</span>
            </div>
          </div>

          <div className="sm:max-w-[15rem] sm:text-right">
            <p className="eyebrow mb-2">From</p>
            <p className="text-[14px] font-semibold text-foreground">
              <SupplierValue value={SUPPLIER.legalName} />
            </p>
            <div className="mt-1.5 space-y-0.5 text-[12px] leading-5 text-ink-soft">
              <p>
                {hasVat ? (
                  <>
                    VAT <SupplierValue value={SUPPLIER.vatNumber} />
                  </>
                ) : (
                  "Not VAT registered"
                )}
              </p>
              <p>
                Reg. <SupplierValue value={SUPPLIER.registrationNumber} />
              </p>
              <p>
                <SupplierValue value={SUPPLIER.legalAddress} />
              </p>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-hairline pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Billed to" value={invoice.salonName} />
          <Field
            label="Period"
            value={`${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
          />
          <Field
            label="Sent"
            value={invoice.sentAt ? formatDate(invoice.sentAt) : "—"}
            hint={`${SUPPLIER.paymentTermDays}-day term`}
          />
          <Field
            label="Paid"
            value={invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
          />
        </dl>
      </section>

      {/* Frozen line items */}
      <section className="overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="border-b border-hairline px-5 py-3.5">
          <h2 className="display-type text-[15px] font-bold tracking-[-0.01em]">
            Line items
          </h2>
        </div>
        <Table className="[&_td]:py-3">
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
                <TableCell className="pl-5 text-[13px] whitespace-nowrap text-ink-muted">
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
        <div className="flex justify-end border-t border-hairline px-5 py-4">
          <div className="w-full max-w-xs space-y-2">
            <TotalRow label="Net commission" value={formatMoney(invoice.subtotal)} />
            {hasVat ? (
              <TotalRow
                label={`VAT (${formatRate(invoice.vatRateBps)})`}
                value={formatMoney(invoice.vatAmount)}
              />
            ) : (
              <p className="text-[12px] text-ink-soft">
                Not VAT liable — no VAT applied.
              </p>
            )}
            <div className="border-t border-hairline pt-2">
              <TotalRow label="Total" value={formatMoney(invoice.total)} strong />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Renders a supplier identity field. Pre-go-live the config carries
 * "TODO — …" placeholders; show those as a muted, italic "to be filled" hint
 * rather than letting the raw marker read as broken data.
 */
function SupplierValue({ value }: { value: string }) {
  const placeholder = value.replace(/^TODO\s*—\s*/, "");
  if (placeholder !== value) {
    return <span className="text-ink-soft/70 italic">{placeholder}</span>;
  }
  return <>{value}</>;
}
