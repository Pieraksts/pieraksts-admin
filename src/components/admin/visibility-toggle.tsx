"use client";

import { useState, useTransition } from "react";
import { Eye, EyeSlash, Prohibit } from "@phosphor-icons/react";

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
import {
  releaseSalonModeration,
  suspendSalonModeration,
} from "@/lib/actions/salons";
import type { SalonVisibility } from "@/lib/data/salons";

/**
 * `RDY-1`/`RDY-008`. Marketplace visibility is derived by the backend from
 * owner publication intent, Publication Readiness, and entitlement. Admin does
 * not own a publication switch — it presents the derived state read-only and
 * controls only Moderation Suspension, the independent exceptional override for
 * fraud, safety, legal, or marketplace-policy enforcement.
 *
 * Releasing a suspension restores whatever the derived state would otherwise
 * be; it never publishes a salon that is not ready or not entitled.
 */
const STATE_LABEL: Record<SalonVisibility["state"], string> = {
  published: "Public",
  "owner-hidden": "Hidden by owner",
  "not-ready": "Setup incomplete",
  "no-entitlement": "No subscription",
  suspended: "Suspended",
};

const STATE_TITLE: Record<SalonVisibility["state"], string> = {
  published:
    "Visible in the booking app. Derived from owner intent, readiness, and entitlement.",
  "owner-hidden":
    "Ready and entitled, but the owner chose to hide it from Pieraksts.",
  "not-ready":
    "Publication Readiness is not satisfied, so the salon cannot be public.",
  "no-entitlement":
    "No trialing or paid entitlement, so the salon cannot be public.",
  suspended:
    "Suspended by Pieraksts moderation. Readiness and payment cannot override this.",
};

export function VisibilityToggle({
  salonId,
  visibility,
}: {
  salonId: string;
  visibility: SalonVisibility;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const suspended = visibility.isModerationSuspended;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        if (suspended) {
          await releaseSalonModeration(salonId);
        } else {
          await suspendSalonModeration(salonId, reason);
        }
        setOpen(false);
        setReason("");
      } catch {
        setError("Could not update. Please try again.");
      }
    });
  }

  return (
    <>
      <span
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted"
        title={STATE_TITLE[visibility.state]}
      >
        {visibility.isMarketplaceVisible ? (
          <Eye size={14} weight="duotone" />
        ) : (
          <EyeSlash size={14} weight="duotone" />
        )}
        {STATE_LABEL[visibility.state]}
      </span>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
        title={
          suspended
            ? "Release the moderation suspension and restore the derived visibility."
            : "Suspend this salon for fraud, safety, legal, or policy enforcement."
        }
      >
        <Prohibit size={14} weight="duotone" data-icon="inline-start" />
        {suspended ? "Release suspension" : "Suspend"}
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
            <DialogTitle>
              {suspended ? "Release this suspension?" : "Suspend this salon?"}
            </DialogTitle>
            <DialogDescription>
              {suspended
                ? "The salon returns to whatever its derived visibility would otherwise be. It is not published unless it is ready and entitled."
                : "The salon is removed from every public surface until the suspension is released. Readiness and payment cannot override a suspension. Existing bookings are unaffected."}
            </DialogDescription>
          </DialogHeader>

          {suspended ? (
            visibility.moderationReason ? (
              <p className="text-[14px] text-foreground">
                Current reason: {visibility.moderationReason}
              </p>
            ) : null
          ) : (
            <label className="grid gap-1.5 text-[14px] text-foreground">
              Reason (recorded for audit)
              <input
                type="text"
                className="rounded-md border border-border px-2.5 py-1.5"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. policy enforcement"
              />
            </label>
          )}

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
              {suspended ? "Release suspension" : "Suspend salon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
