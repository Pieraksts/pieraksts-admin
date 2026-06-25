import type { Icon } from "@phosphor-icons/react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A bordered content panel with a titled header bar — the repeated dashboard
 * section shell. `action` sits opposite the title (counts, buttons, dialogs).
 */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-hairline bg-card",
        className,
      )}
    >
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

/** Uppercase, letter-spaced column heading shared by every admin table. */
export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 text-[11px] font-semibold tracking-[0.1em] text-ink-soft uppercase",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

/** A label/value pair for definition-list style summaries. */
export function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <div>
      <dt className="eyebrow mb-1.5">{label}</dt>
      <dd className="text-[14px] text-foreground">{value ?? "—"}</dd>
      {hint ? <p className="mt-0.5 text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

/**
 * A centered, consistent empty state: optional icon in a soft disc, a short
 * title, and a guiding sentence. One voice across every section.
 */
export function EmptyState({
  icon: IconComp,
  title,
  description,
}: {
  icon?: Icon;
  title?: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {IconComp ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-warm-strong text-brand">
          <IconComp size={22} weight="duotone" />
        </span>
      ) : null}
      <div className="space-y-1">
        {title ? (
          <p className="text-[14px] font-semibold text-foreground">{title}</p>
        ) : null}
        <p className="mx-auto max-w-sm text-[13px] leading-6 text-ink-muted text-balance">
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * One line in a right-aligned totals stack: muted label, mono tabular figure.
 * `strong` marks the grand total.
 */
export function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span
        className={cn(
          "text-[13px]",
          strong ? "font-semibold text-foreground" : "text-ink-muted",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          strong
            ? "text-[15px] font-bold text-foreground"
            : "text-[14px] text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
