import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle,
  FilePlus,
  FileText,
  IdentificationCard,
  Receipt,
} from "@phosphor-icons/react/dist/ssr";

import { ClientStatusSelect } from "@/components/admin/client-status-select";
import { ContractActions } from "@/components/admin/contract-actions";
import { GenerateInvoice } from "@/components/admin/generate-invoice";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { LegalProfileDialog } from "@/components/admin/legal-profile-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState, Field, Section, Th } from "@/components/admin/section";
import { FeaturedToggle } from "@/components/admin/featured-toggle";
import { StatusBadge } from "@/components/admin/status-badge";
import { VisibilityToggle } from "@/components/admin/visibility-toggle";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUPPLIER, SUPPLIER_VAT_RATE_BPS } from "@/lib/config/supplier";
import type { BookingFee } from "@/lib/data/salons";
import { getSalon } from "@/lib/data/salons";
import { formatDate, formatMoney, formatRate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalonDetailPage(
  props: PageProps<"/salons/[salonId]">,
) {
  const { salonId } = await props.params;
  const salon = await getSalon(salonId);
  if (!salon) notFound();

  const uninvoicedFees = salon.bookingFees.filter((f) => !f.invoiced);
  const uninvoicedTotal = uninvoicedFees.reduce(
    (s, f) => s + f.commissionAmount,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        backHref="/salons"
        backLabel="Salons"
        title={salon.name}
        actions={
          <Button asChild>
            <Link href={`/salons/${salon.id}/contract/new`}>
              <FilePlus size={16} weight="bold" data-icon="inline-start" />
              New contract
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[14px] text-ink-muted">
        <ClientStatusSelect
          salonId={salon.id}
          status={salon.clientStatus}
          activeContract={salon.activeContract}
        />
        <VisibilityToggle salonId={salon.id} visibility={salon.visibility} />
        <FeaturedToggle salonId={salon.id} isFeatured={salon.isFeatured} />
        <span aria-hidden>·</span>
        <span>{salon.city}</span>
        {salon.activeContract ? (
          <>
            <span aria-hidden>·</span>
            <span>
              {formatRate(salon.activeContract.commissionRateBps)} commission
            </span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <span className="font-mono tabular-nums">
          {formatMoney(salon.uninvoiced)} uninvoiced
        </span>
      </div>

      {/* Legal profile */}
      <Section
        title="Legal profile"
        action={
          <LegalProfileDialog salonId={salon.id} profile={salon.legalProfile} />
        }
      >
        {salon.legalProfile ? (
          <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2">
            <Field label="Company name" value={salon.legalProfile.companyName} />
            <Field
              label="Registration no."
              value={salon.legalProfile.registrationNumber}
            />
            <Field label="VAT number" value={salon.legalProfile.vatNumber} />
            <Field
              label="Contact person"
              value={salon.legalProfile.contactPerson}
            />
            <Field
              label="Legal address"
              value={salon.legalProfile.legalAddress}
            />
            <Field
              label="Billing email"
              value={salon.legalProfile.billingEmail}
            />
            <Field
              label="Billing phone"
              value={salon.legalProfile.billingPhone}
            />
          </dl>
        ) : (
          <EmptyState
            icon={IdentificationCard}
            title="No legal profile yet"
            description="Add the company's legal details with “Add legal profile” above — it's required before drafting a contract."
          />
        )}
      </Section>

      {/* Contracts */}
      <Section title="Contract history">
        {salon.contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No contracts yet"
            description="Draft the first versioned contract with “New contract” above. Billing starts once one is active."
          />
        ) : (
          <Table className="[&_td]:py-3">
            <TableHeader>
              <TableRow className="border-hairline hover:bg-transparent">
                <Th className="pl-5">Version</Th>
                <Th>Commission</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Status</Th>
                <Th className="pr-5 text-right">Actions</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salon.contracts.map((c) => (
                <TableRow key={c.id} className="border-hairline">
                  <TableCell className="pl-5 font-mono text-[13px] tabular-nums">
                    v{c.version}
                  </TableCell>
                  <TableCell className="text-[13px] text-foreground">
                    {formatRate(c.commissionRateBps)}
                  </TableCell>
                  <TableCell className="text-[13px] whitespace-nowrap text-ink-muted">
                    {formatDate(c.startDate)}
                  </TableCell>
                  <TableCell className="text-[13px] whitespace-nowrap text-ink-muted">
                    {formatDate(c.endDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <ContractActions
                      salonId={salon.id}
                      contract={c}
                      activeContract={salon.activeContract}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Uninvoiced booking fees, grouped by month so stragglers stay visible */}
      <Section
        title="Uninvoiced fees"
        action={
          <div className="flex items-center gap-3">
            {uninvoicedFees.length > 0 ? (
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                {formatMoney(uninvoicedTotal)}
              </span>
            ) : null}
            <GenerateInvoice
              salonId={salon.id}
              uninvoicedFees={uninvoicedFees}
              vatRateBps={SUPPLIER_VAT_RATE_BPS}
              vatRegistered={SUPPLIER.vatRegistered}
            />
          </div>
        }
      >
        {uninvoicedFees.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All caught up"
            description="No fees waiting to be invoiced. New ones appear here as bookings complete under an active contract."
          />
        ) : (
          <Table className="[&_td]:py-3">
            <TableHeader>
              <TableRow className="border-hairline hover:bg-transparent">
                <Th className="pl-5">Date</Th>
                <Th>Service</Th>
                <Th className="text-right">Booking</Th>
                <Th>Rate</Th>
                <Th className="pr-5 text-right">Commission</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupFeesByMonth(uninvoicedFees).map((group) => (
                <Fragment key={group.month}>
                  <TableRow className="border-hairline bg-warm-strong hover:bg-warm-strong">
                    <TableCell colSpan={4} className="pl-5">
                      <span className="text-[12px] font-semibold tracking-[0.04em] text-foreground uppercase">
                        {monthLabel(group.month)}
                      </span>
                      <span className="ml-2 text-[12px] text-ink-soft">
                        {group.fees.length}{" "}
                        {group.fees.length === 1 ? "fee" : "fees"}
                      </span>
                    </TableCell>
                    <TableCell className="pr-5 text-right font-mono text-[12px] font-semibold tabular-nums text-ink-muted">
                      {formatMoney(group.subtotal)}
                    </TableCell>
                  </TableRow>
                  {group.fees.map((f) => (
                    <TableRow key={f.id} className="border-hairline">
                      <TableCell className="pl-5 text-[13px] whitespace-nowrap text-ink-muted">
                        {formatDate(f.bookingDate)}
                      </TableCell>
                      <TableCell className="text-[13px] text-foreground">
                        {f.serviceName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                        {formatMoney(f.grossAmount)}
                      </TableCell>
                      <TableCell className="text-[13px] text-ink-muted">
                        {formatRate(f.commissionRateBps)}
                      </TableCell>
                      <TableCell className="pr-5 text-right font-mono text-[13px] tabular-nums text-foreground">
                        {formatMoney(f.commissionAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Invoices */}
      <Section title="Invoices">
        {salon.invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Generate one from the uninvoiced fees above, a calendar month at a time."
          />
        ) : (
          <Table className="[&_td]:py-3">
            <TableHeader>
              <TableRow className="border-hairline hover:bg-transparent">
                <Th className="pl-5">Number</Th>
                <Th>Period</Th>
                <Th className="text-right">Net</Th>
                <Th className="text-right">VAT</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th className="pr-5 text-right">Actions</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salon.invoices.map((inv) => (
                <TableRow key={inv.id} className="border-hairline">
                  <TableCell className="pl-5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-mono text-[13px] font-semibold tabular-nums text-brand-strong hover:text-brand hover:underline"
                    >
                      {inv.reference}
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
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <InvoiceActions invoice={inv} salonId={salon.id} />
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

type FeeMonthGroup = { month: string; fees: BookingFee[]; subtotal: number };

/** Group fees by booking month (YYYY-MM), newest month first. */
function groupFeesByMonth(fees: BookingFee[]): FeeMonthGroup[] {
  const byMonth = new Map<string, BookingFee[]>();
  for (const fee of fees) {
    const month = fee.bookingDate.slice(0, 7);
    byMonth.set(month, [...(byMonth.get(month) ?? []), fee]);
  }
  return [...byMonth.entries()]
    .map(([month, monthFees]) => ({
      month,
      fees: monthFees,
      subtotal: monthFees.reduce((s, f) => s + f.commissionAmount, 0),
    }))
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00Z`));
}
