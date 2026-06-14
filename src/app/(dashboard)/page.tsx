import Link from "next/link";
import {
  ArrowRight,
  Buildings,
  CheckCircle,
  FileText,
  Receipt,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { getOverview, getSalons } from "@/lib/data/salons";
import { formatMoney } from "@/lib/format";

export default async function OverviewPage() {
  const [overview, salons] = await Promise.all([getOverview(), getSalons()]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Salon contracts, completed-booking fees, and invoices at a glance."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Salon clients"
          value={String(overview.salonCount)}
          hint={`${overview.activeCount} active`}
          icon={Buildings}
        />
        <StatCard
          label="Uninvoiced fees"
          value={formatMoney(overview.uninvoicedCents)}
          hint="Awaiting invoice"
          icon={Receipt}
          mono
        />
        <StatCard
          label="Open contracts"
          value={String(overview.openContractCount)}
          hint="Draft or pending"
          icon={FileText}
        />
        <StatCard
          label="Needs attention"
          value={String(overview.attention.length)}
          hint="Items below"
          icon={Warning}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        {/* Needs attention */}
        <div className="rounded-xl border border-hairline bg-card lg:col-span-3">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="display-type text-[16px] font-bold tracking-[-0.01em]">
              Needs attention
            </h2>
          </div>
          {overview.attention.length === 0 ? (
            <div className="flex items-center gap-3 px-5 py-8 text-ink-muted">
              <CheckCircle size={20} weight="duotone" className="text-brand" />
              <p className="text-[14px]">Nothing needs attention right now.</p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {overview.attention.map((item, i) => (
                <li key={`${item.salonId}-${i}`}>
                  <Link
                    href={`/salons/${item.salonId}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-warm-strong"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">
                        {item.salonName}
                      </p>
                      <p className="text-[13px] text-ink-muted">{item.reason}</p>
                    </div>
                    <ArrowRight
                      size={16}
                      weight="bold"
                      className="shrink-0 text-ink-soft"
                    />
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
          <ul className="divide-y divide-hairline">
            {salons.map((salon) => (
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
        </div>
      </section>
    </div>
  );
}
