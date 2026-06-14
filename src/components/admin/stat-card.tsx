import type { Icon } from "@phosphor-icons/react";

export function StatCard({
  label,
  value,
  hint,
  icon: IconComp,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: Icon;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <IconComp size={18} weight="duotone" className="text-brand" />
      </div>
      <p
        className={`mt-3 text-[26px] leading-none font-extrabold tracking-[-0.02em] text-foreground ${
          mono ? "font-mono tabular-nums" : "display-type"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[13px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}
