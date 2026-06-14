import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";

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
import { getSalons } from "@/lib/data/salons";
import { formatMoney, formatRate } from "@/lib/format";

export const metadata = { title: "Salons · Pieraksts Admin" };

export default async function SalonsPage() {
  const salons = await getSalons();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Salons"
        description="Every salon client, their current contract, and fees ready to invoice."
        actions={
          <Button disabled title="Salon onboarding is not built yet">
            <Plus size={16} weight="bold" data-icon="inline-start" />
            Add salon
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <Th className="pl-5">Salon</Th>
              <Th>Status</Th>
              <Th>Current contract</Th>
              <Th className="text-right">Uninvoiced</Th>
              <Th className="pr-5 text-right">Latest invoice</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salons.map((salon) => (
              <TableRow
                key={salon.id}
                className="border-hairline transition-colors hover:bg-warm-strong"
              >
                <TableCell className="py-0 pl-5">
                  <Link
                    href={`/salons/${salon.id}`}
                    className="-mx-1 flex flex-col gap-0.5 rounded-md px-1 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="text-[14px] font-semibold text-foreground">
                      {salon.name}
                    </span>
                    <span className="text-[12px] text-ink-soft">
                      {salon.city}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={salon.clientStatus} />
                </TableCell>
                <TableCell className="text-[13px] text-ink-muted">
                  {salon.activeContract
                    ? `${formatRate(salon.activeContract.commissionRateBps)} commission`
                    : "No active contract"}
                </TableCell>
                <TableCell className="text-right font-mono text-[13px] tabular-nums text-foreground">
                  {formatMoney(salon.uninvoicedCents)}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  {salon.latestInvoiceStatus ? (
                    <StatusBadge status={salon.latestInvoiceStatus} />
                  ) : (
                    <span className="text-[13px] text-ink-soft">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
