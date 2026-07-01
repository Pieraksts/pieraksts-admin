import Link from "next/link";
import { Plus, Star } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { Th } from "@/components/admin/section";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalons } from "@/lib/data/salons";
import { formatMoney, formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Salons · Pieraksts Admin" };

export const dynamic = "force-dynamic";

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const salons = await getSalons();

  const featuredCount = salons.filter((salon) => salon.isFeatured).length;
  const showFeaturedOnly = filter === "featured";
  const rows = showFeaturedOnly
    ? salons.filter((salon) => salon.isFeatured)
    : salons;

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

      <div className="flex items-center gap-2">
        <Link
          href="/salons"
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            showFeaturedOnly
              ? "border-hairline text-ink-muted hover:bg-warm-strong"
              : "border-brand-muted bg-brand-soft text-brand-strong",
          )}
        >
          All salons{" "}
          <span className="tabular-nums opacity-70">{salons.length}</span>
        </Link>
        <Link
          href="/salons?filter=featured"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            showFeaturedOnly
              ? "border-amber-400/50 bg-amber-50 text-amber-700"
              : "border-hairline text-ink-muted hover:bg-warm-strong",
          )}
        >
          <Star size={13} weight="fill" className="text-amber-500" />
          Featured{" "}
          <span className="tabular-nums opacity-70">{featuredCount}</span>
        </Link>
      </div>

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
            {rows.length === 0 ? (
              <TableRow className="border-hairline hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-[13px] text-ink-muted"
                >
                  No featured salons yet. Open a salon and turn on Featured to
                  spotlight it in the app.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((salon) => (
                <TableRow
                  key={salon.id}
                  className="border-hairline transition-colors hover:bg-warm-strong"
                >
                  <TableCell className="py-0 pl-5">
                    <Link
                      href={`/salons/${salon.id}`}
                      className="-mx-1 flex flex-col gap-0.5 rounded-md px-1 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
                        {salon.name}
                        {salon.isFeatured ? (
                          <Star
                            size={13}
                            weight="fill"
                            className="shrink-0 text-amber-500"
                            aria-label="Featured"
                          />
                        ) : null}
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
                    {formatMoney(salon.uninvoiced)}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {salon.latestInvoiceStatus ? (
                      <StatusBadge status={salon.latestInvoiceStatus} />
                    ) : (
                      <span className="text-[13px] text-ink-soft">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
