import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FilePlus,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";

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
import { getSalon } from "@/lib/data/salons";
import { formatDate, formatMoney, formatRate } from "@/lib/format";

export default async function SalonDetailPage(
  props: PageProps<"/salons/[salonId]">,
) {
  const { salonId } = await props.params;
  const salon = await getSalon(salonId);
  if (!salon) notFound();

  const uninvoicedFees = salon.bookingFees.filter((f) => !f.invoiced);

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

      <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink-muted">
        <StatusBadge status={salon.clientStatus} />
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
          {formatMoney(salon.uninvoicedCents)} uninvoiced
        </span>
      </div>

      {/* Legal profile */}
      <Section
        title="Legal profile"
        action={
          salon.legalProfile ? (
            <Button variant="ghost" size="sm" disabled title="Editing coming soon">
              <PencilSimple size={14} data-icon="inline-start" />
              Edit
            </Button>
          ) : null
        }
      >
        {salon.legalProfile ? (
          <dl className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-2">
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
            message="No legal profile yet. It's required before drafting a contract."
            cta="Add legal profile"
          />
        )}
      </Section>

      {/* Contracts */}
      <Section title="Contract history">
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <Th className="pl-5">Version</Th>
              <Th>Commission</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th className="pr-5 text-right">Status</Th>
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
                <TableCell className="text-[13px] text-ink-muted">
                  {formatDate(c.startDate)}
                </TableCell>
                <TableCell className="text-[13px] text-ink-muted">
                  {formatDate(c.endDate)}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <StatusBadge status={c.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      {/* Uninvoiced booking fees */}
      <Section
        title="Uninvoiced fees"
        action={
          uninvoicedFees.length > 0 ? (
            <span className="font-mono text-[13px] tabular-nums text-ink-muted">
              {formatMoney(
                uninvoicedFees.reduce((s, f) => s + f.commissionAmountCents, 0),
              )}
            </span>
          ) : null
        }
      >
        {uninvoicedFees.length === 0 ? (
          <EmptyState message="No fees waiting to be invoiced." />
        ) : (
          <Table>
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
              {uninvoicedFees.map((f) => (
                <TableRow key={f.id} className="border-hairline">
                  <TableCell className="pl-5 text-[13px] text-ink-muted">
                    {formatDate(f.bookingDate)}
                  </TableCell>
                  <TableCell className="text-[13px] text-foreground">
                    {f.serviceName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-ink-muted">
                    {formatMoney(f.grossAmountCents)}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {formatRate(f.commissionRateBps)}
                  </TableCell>
                  <TableCell className="pr-5 text-right font-mono text-[13px] tabular-nums text-foreground">
                    {formatMoney(f.commissionAmountCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Invoices */}
      <Section title="Invoices">
        {salon.invoices.length === 0 ? (
          <EmptyState message="No invoices generated yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-hairline hover:bg-transparent">
                <Th className="pl-5">Reference</Th>
                <Th>Period</Th>
                <Th className="text-right">Subtotal</Th>
                <Th className="pr-5 text-right">Status</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salon.invoices.map((inv) => (
                <TableRow key={inv.id} className="border-hairline">
                  <TableCell className="pl-5 font-mono text-[13px] tabular-nums text-foreground">
                    {inv.reference}
                  </TableCell>
                  <TableCell className="text-[13px] text-ink-muted">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular-nums text-foreground">
                    {formatMoney(inv.subtotalCents)}
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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="eyebrow mb-1.5">{label}</dt>
      <dd className="text-[14px] text-foreground">{value ?? "—"}</dd>
    </div>
  );
}

function EmptyState({ message, cta }: { message: string; cta?: string }) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-8">
      <p className="text-[14px] text-ink-muted">{message}</p>
      {cta ? (
        <Button variant="outline" size="sm" disabled title="Coming soon">
          {cta}
        </Button>
      ) : null}
    </div>
  );
}
