import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "positive" | "progress" | "muted" | "danger";

// On-brand status tones. The palette is intentionally monochrome + rose, so
// meaning is carried by the label text too, never by colour alone.
const TONE: Record<Tone, string> = {
  positive: "border-brand-muted bg-brand-soft text-brand-strong",
  progress: "border-warm-border bg-warm-strong text-foreground",
  muted: "border-border bg-muted text-ink-muted",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // client status
  new: { label: "New", tone: "progress" },
  active: { label: "Active", tone: "positive" },
  paused: { label: "Paused", tone: "muted" },
  terminated: { label: "Terminated", tone: "danger" },
  // contract status
  draft: { label: "Draft", tone: "progress" },
  pending_signature: { label: "Pending signature", tone: "progress" },
  signed: { label: "Signed", tone: "positive" },
  // invoice status
  sent: { label: "Sent", tone: "progress" },
  paid: { label: "Paid", tone: "positive" },
  overdue: { label: "Overdue", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS[status] ?? { label: status, tone: "muted" as Tone };
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5", TONE[meta.tone], className)}
    >
      {meta.label}
    </Badge>
  );
}
