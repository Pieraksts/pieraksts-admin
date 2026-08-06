import { PageHeader } from "@/components/admin/page-header";

const SKELETON_ROWS = [0, 1, 2, 3, 4];

/**
 * Route-level fallback for the server fetch in `page.tsx`. It mirrors the real
 * layout — header, filter row, table shell — so the queue does not jump when
 * the cases arrive.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Review reports"
        description="Owner-reported salon reviews awaiting moderation. Resolving a case closes the report without deleting the review."
      />

      <div className="flex items-center gap-2" aria-hidden>
        {SKELETON_ROWS.slice(0, 3).map((index) => (
          <span
            key={index}
            className="h-7 w-24 animate-pulse rounded-full border border-hairline bg-warm-strong"
          />
        ))}
      </div>

      <div
        className="overflow-hidden rounded-xl border border-hairline bg-card"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading review reports…</span>
        <div className="h-11 border-b border-hairline bg-warm-strong/40" aria-hidden />
        {SKELETON_ROWS.map((index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-hairline px-5 py-4 last:border-b-0"
            aria-hidden
          >
            <div className="flex flex-1 flex-col gap-2">
              <span className="h-3.5 w-40 animate-pulse rounded bg-warm-strong" />
              <span className="h-3 w-64 animate-pulse rounded bg-warm-strong" />
            </div>
            <span className="h-3 w-24 animate-pulse rounded bg-warm-strong" />
            <span className="h-7 w-20 animate-pulse rounded-lg bg-warm-strong" />
          </div>
        ))}
      </div>
    </div>
  );
}
