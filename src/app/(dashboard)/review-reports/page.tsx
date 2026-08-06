import Link from "next/link";
import { Flag, Star } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { ResolveReviewReport } from "@/components/admin/resolve-review-report";
import { EmptyState, Th } from "@/components/admin/section";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getReviewModerationCases,
  type ReviewModerationStatusFilter,
} from "@/lib/data/review-moderation";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Review reports · Pieraksts Admin" };

export const dynamic = "force-dynamic";

const FILTERS: {
  value: ReviewModerationStatusFilter;
  label: string;
  /** Shown when this filter has no cases. Each view means a different thing. */
  emptyTitle: string;
  emptyDescription: string;
}[] = [
  {
    value: "open",
    label: "Open",
    emptyTitle: "The queue is clear",
    emptyDescription:
      "No owner has an unresolved report right now. New reports land here as soon as a salon owner files one.",
  },
  {
    value: "resolved",
    label: "Resolved",
    emptyTitle: "Nothing resolved yet",
    emptyDescription:
      "Cases you close appear here with the moderator's note. Resolving never removes the review itself.",
  },
  {
    value: "all",
    label: "All",
    emptyTitle: "No review reports",
    emptyDescription:
      "No salon owner has reported a review. There is nothing to moderate.",
  },
];

function parseStatus(raw: string | undefined): ReviewModerationStatusFilter {
  if (raw === "resolved" || raw === "all") return raw;
  return "open";
}

const reportedAtFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatReportedAt(iso: string): string {
  return reportedAtFmt.format(new Date(iso));
}

const STAR_POSITIONS = [1, 2, 3, 4, 5];

/** The rating read as a rating, with the number kept for screen readers. */
function Rating({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 align-middle"
      title={`${value} out of 5`}
    >
      <span className="sr-only">{value} out of 5</span>
      {STAR_POSITIONS.map((position) => (
        <Star
          key={position}
          size={12}
          weight={position <= Math.round(value) ? "fill" : "regular"}
          className={
            position <= Math.round(value) ? "text-brand" : "text-ink-soft"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * Case state. The palette is monochrome + rose, so the label carries the
 * meaning and colour only reinforces it.
 */
function CaseStatusBadge({
  tone,
  label,
}: {
  tone: "open" | "resolved";
  label: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5",
        tone === "open"
          ? "border-brand-muted bg-brand-soft text-brand-strong"
          : "border-border bg-muted text-ink-muted",
      )}
    >
      {label}
    </Badge>
  );
}

export default async function ReviewReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);
  const cases = await getReviewModerationCases(status);
  const activeFilter = FILTERS.find((filter) => filter.value === status) ?? FILTERS[0];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Review reports"
        description="Owner-reported salon reviews awaiting moderation. Resolving a case closes the report — the review itself is never deleted, hidden, or edited."
      />

      <nav aria-label="Filter review reports" className="flex items-center gap-2">
        {FILTERS.map((filter) => {
          const isActive = status === filter.value;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "open"
                  ? "/review-reports"
                  : `/review-reports?status=${filter.value}`
              }
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-brand-muted bg-brand-soft text-brand-strong"
                  : "border-hairline text-ink-muted hover:bg-warm-strong",
              )}
            >
              {filter.label}
              {isActive ? (
                <span className="ml-1.5 tabular-nums opacity-70">
                  {cases.length}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        {cases.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={activeFilter.emptyTitle}
            description={activeFilter.emptyDescription}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-hairline hover:bg-transparent">
                  <Th className="pl-5">Salon / review</Th>
                  <Th>Report</Th>
                  <Th>Reported</Th>
                  <Th>Status</Th>
                  <Th className="pr-5 text-right">Action</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((moderationCase) => {
                  const isOpen = moderationCase.resolvedAt === null;
                  const reason = moderationCase.reason?.trim();
                  return (
                    <TableRow
                      key={moderationCase.id}
                      className="border-hairline align-top transition-colors hover:bg-warm-strong"
                    >
                      <TableCell className="max-w-[26rem] py-4 pl-5">
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/salons/${moderationCase.salonId}`}
                            className="text-[14px] font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            {moderationCase.salonName}
                          </Link>
                          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-ink-soft">
                            <Rating value={moderationCase.rating} />
                            <span>{moderationCase.serviceName}</span>
                            <span aria-hidden>·</span>
                            <span>{moderationCase.clientName}</span>
                          </span>
                          {moderationCase.note.trim() ? (
                            <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-ink-muted">
                              {moderationCase.note}
                            </p>
                          ) : (
                            <p className="mt-1 text-[13px] text-ink-soft italic">
                              No written note
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[18rem] py-4">
                        <div className="flex flex-col gap-1">
                          <p className="line-clamp-3 text-[13px] leading-5 text-ink-muted">
                            {reason || "No reason given"}
                          </p>
                          {moderationCase.reportedByUserId ? (
                            <span
                              className="truncate font-mono text-[11px] text-ink-soft"
                              title={moderationCase.reportedByUserId}
                            >
                              by {moderationCase.reportedByUserId}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="py-4 text-[13px] whitespace-nowrap text-ink-muted tabular-nums">
                        {formatReportedAt(moderationCase.reportedAt)}
                      </TableCell>

                      <TableCell className="max-w-[14rem] py-4 text-[13px]">
                        {isOpen ? (
                          <CaseStatusBadge tone="open" label="Open" />
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <CaseStatusBadge tone="resolved" label="Resolved" />
                            <span className="text-[12px] text-ink-soft">
                              {formatDate(moderationCase.resolvedAt)}
                            </span>
                            {moderationCase.resolutionNote ? (
                              <span className="line-clamp-3 text-[12px] leading-5 text-ink-soft">
                                {moderationCase.resolutionNote}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-4 pr-5 text-right">
                        {isOpen ? (
                          <ResolveReviewReport
                            caseId={moderationCase.id}
                            salonName={moderationCase.salonName}
                          />
                        ) : (
                          <span className="text-[13px] text-ink-soft" aria-hidden>
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
