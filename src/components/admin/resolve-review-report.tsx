"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Warning } from "@phosphor-icons/react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveReviewModerationCase } from "@/lib/actions/review-moderation";

const NOTE_MAX_LENGTH = 500;

/**
 * `REV-003`. Resolve a reported review case. This closes the moderation case
 * and nothing else — it never deletes, hides, or edits the underlying salon
 * review, and the dialog says so before the moderator commits.
 *
 * The action is awaited inside `startTransition`, so `pending` stays true for
 * the whole server round trip, including the `revalidatePath` re-render.
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
        // The dialog stays open so the note survives and the failure is visible.
        setError(
          "Could not resolve this case. Nothing was changed — check your connection and try again.",
        );
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        // The default control sizes sit under the 44×44 touch-target contract,
        // so the moderation actions raise it locally rather than resizing every
        // button in Admin.
        className="min-h-11 px-3.5"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <CheckCircle size={14} weight="duotone" data-icon="inline-start" />
        {pending ? "Resolving…" : "Resolve"}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Never let a backdrop click abandon an in-flight transition.
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Resolve this report?</DialogTitle>
            <DialogDescription>
              Marks the report for {salonName} as reviewed. This closes the
              moderation case only — the review stays published exactly as the
              client wrote it, and is not deleted, hidden, or edited.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor={`resolution-note-${caseId}`}>
              Resolution note (optional)
            </Label>
            <Textarea
              id={`resolution-note-${caseId}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={pending}
              maxLength={NOTE_MAX_LENGTH}
              rows={3}
              placeholder="e.g. Reviewed; no action needed"
            />
            <p className="text-[12px] text-ink-soft">
              Saved on the case for the audit trail.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-2 text-[13px] leading-5 text-destructive"
            >
              <Warning size={15} weight="duotone" className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="min-h-11 px-4" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="min-h-11 px-4"
              onClick={submit}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Resolving…" : "Resolve report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
