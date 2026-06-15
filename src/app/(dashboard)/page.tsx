import Link from "next/link";
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  Receipt,
  Users,
} from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { getOverview, getSalons } from "@/lib/data/salons";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [overview, salons] = await Promise.all([getOverview(), getSalons()]);
  const recentSalons = salons.slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Salon contracts, completed-booking fees, and invoices at a glance."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total salons"
          value={String(overview.salonCount)}
          hint="Registered in the app"
          icon={Buildings}
        />
        <StatCard
          label="Active salons"
          value={String(overview.activeCount)}
          hint="Client status active"
          icon={CheckCircle}
        />
        <StatCard
          label="App users"
          value={overview.appUserCount.toLocaleString("en-IE")}
          hint="Registered customers"
          icon={Users}
        />
        <StatCard
          label="Uninvoiced fees"
          value={formatMoney(overview.uninvoiced)}
          hint="Awaiting invoice"
          icon={Receipt}
          mono
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        {/* Recent invoices */}
        <div className="rounded-xl border border-hairline bg-card lg:col-span-3">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="display-type text-[16px] font-bold tracking-[-0.01em]">
              Recent invoices
            </h2>
          </div>
          {overview.recentInvoices.length === 0 ? (
            <div className="px-5 py-8">
              <p className="text-[14px] text-ink-muted">
                No invoices generated yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {overview.recentInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/salons/${inv.salonId}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-warm-strong"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {inv.salonName}
                      </p>
                      <p className="text-[12px] text-ink-soft">
                        <span className="font-mono tabular-nums">
                          {inv.reference}
                        </span>{" "}
                        · {formatDate(inv.periodStart)} –{" "}
                        {formatDate(inv.periodEnd)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono text-[13px] tabular-nums text-foreground">
                        {formatMoney(inv.total)}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Salon shortcuts */}
        <div className="rounded-xl border border-hairline bg-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <h2 className="display-type text-[16px] font-bold tracking-[-0.01em]">
              Salons
            </h2>
            <Link
              href="/salons"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-strong transition-colors hover:text-brand"
            >
              All
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
          {recentSalons.length === 0 ? (
            <div className="px-5 py-8">
              <p className="text-[14px] text-ink-muted">No salons yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {recentSalons.map((salon) => (
                <li key={salon.id}>
                  <Link
                    href={`/salons/${salon.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-warm-strong"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {salon.name}
                      </p>
                      <p className="text-[12px] text-ink-soft">{salon.city}</p>
                    </div>
                    <StatusBadge status={salon.clientStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
