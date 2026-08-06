"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { Warning } from "@phosphor-icons/react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

/**
 * `REV-003`. When the moderation-case fetch fails the moderator must see a
 * failure and a way out, never a blank table that reads as "no reports".
 *
 * Next 16 passes `unstable_retry` here — it re-fetches and re-renders this
 * segment. There is no `reset` prop in this version.
 */
export default function ReviewReportsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("review-reports route failed", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Review reports"
        description="Owner-reported salon reviews awaiting moderation."
      />

      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl border border-hairline bg-card px-6 py-12 text-center"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Warning size={22} weight="duotone" />
        </span>
        <div className="space-y-1">
          <p className="text-[14px] font-semibold text-foreground">
            Could not load review reports
          </p>
          <p className="mx-auto max-w-sm text-balance text-[13px] leading-6 text-ink-muted">
            The moderation queue could not be fetched. No case was changed — try
            again, and check the server logs if it keeps failing.
          </p>
          {error.digest ? (
            <p className="pt-1 font-mono text-[12px] text-ink-soft">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
        {/* The only way out of this state, so it meets the 44×44 minimum. */}
        <Button
          type="button"
          className="min-h-11 px-4"
          onClick={() => unstable_retry()}
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
