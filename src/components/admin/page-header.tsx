import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted transition-colors hover:text-foreground"
          >
            <CaretLeft size={14} weight="bold" />
            {backLabel ?? "Back"}
          </Link>
        ) : eyebrow ? (
          <p className="eyebrow mb-2">{eyebrow}</p>
        ) : null}
        <h1 className="display-type text-[26px] leading-tight font-extrabold tracking-[-0.025em] text-foreground sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
