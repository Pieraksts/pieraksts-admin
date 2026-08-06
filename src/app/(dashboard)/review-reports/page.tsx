import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ResolveReviewReport } from "@/components/admin/resolve-review-report";
import { Th } from "@/components/admin/section";
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

const FILTERS: { value: ReviewModerationStatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
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

export default async function ReviewReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);
  const cases = await getReviewModerationCases(status);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Review reports"
        description="Owner-reported salon reviews awaiting moderation. Resolving a case closes the report without deleting the review."
      />

      <div className="flex items-center gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value === "open"
                ? "/review-reports"
                : `/review-reports?status=${filter.value}`
            }
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              status === filter.value
                ? "border-brand-muted bg-brand-soft text-brand-strong"
                : "border-hairline text-ink-muted hover:bg-warm-strong",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <Th className="pl-5">Salon / review</Th>
              <Th>Reason</Th>
              <Th>Reported</Th>
              <Th>Status</Th>
              <Th className="pr-5 text-right">Action</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.length === 0 ? (
              <TableRow className="border-hairline hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-[13px] text-ink-muted"
                >
                  {status === "open"
                    ? "No open review reports."
                    : status === "resolved"
                      ? "No resolved review reports yet."
                      : "No review reports yet."}
                </TableCell>
              </TableRow>
            ) : (
              cases.map((moderationCase) => {
                const isOpen = moderationCase.resolvedAt === null;
                return (
                  <TableRow
                    key={moderationCase.id}
                    className="border-hairline transition-colors hover:bg-warm-strong"
                  >
                    <TableCell className="py-3.5 pl-5">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/salons/${moderationCase.salonId}`}
                          className="text-[14px] font-semibold text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {moderationCase.salonName}
                        </Link>
                        <span className="text-[12px] text-ink-soft">
                          {moderationCase.rating}/5 · {moderationCase.serviceName}{" "}
                          · {moderationCase.clientName}
                        </span>
                        {moderationCase.note ? (
                          <span className="mt-1 max-w-md text-[13px] leading-5 text-ink-muted line-clamp-2">
                            {moderationCase.note}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-[13px] text-ink-muted">
                      {moderationCase.reason?.trim() || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[13px] tabular-nums text-ink-muted">
                      {formatReportedAt(moderationCase.reportedAt)}
                    </TableCell>
                    <TableCell className="text-[13px]">
                      {isOpen ? (
                        <span className="text-amber-700">Open</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-ink-muted">Resolved</span>
                          <span className="text-[12px] text-ink-soft">
                            {formatDate(moderationCase.resolvedAt)}
                          </span>
                          {moderationCase.resolutionNote ? (
                            <span className="max-w-[180px] text-[12px] text-ink-soft line-clamp-2">
                              {moderationCase.resolutionNote}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {isOpen ? (
                        <ResolveReviewReport
                          caseId={moderationCase.id}
                          salonName={moderationCase.salonName}
                        />
                      ) : (
                        <span className="text-[13px] text-ink-soft">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
