"use client";

import { useState, useTransition } from "react";
import { CheckCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveReviewModerationCase } from "@/lib/actions/review-moderation";

/**
 * Resolve a reported review case. Closes the moderation case only — never
 * deletes or edits the underlying salon review.
 */
export function ResolveReviewReport({
  caseId,
  salonName,
}: {
  caseId: string;
  salonName: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await resolveReviewModerationCase(caseId, note);
        setOpen(false);
        setNote("");
      } catch {
        setError("Could not resolve. Please try again.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <CheckCircle size={14} weight="duotone" data-icon="inline-start" />
        Resolve
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve this report?</DialogTitle>
            <DialogDescription>
              Marks the report for {salonName} as reviewed. The review itself is
              not deleted or changed — only the moderation case is closed.
            </DialogDescription>
          </DialogHeader>

          <label className="grid gap-1.5 text-[14px] text-foreground">
            Resolution note (optional)
            <input
              type="text"
              className="rounded-md border border-border px-2.5 py-1.5"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Reviewed; no action needed"
            />
          </label>

          {error ? (
            <p className="text-[13px] text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={submit} disabled={pending}>
              Resolve report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
