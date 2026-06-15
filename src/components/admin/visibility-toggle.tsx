"use client";

import { useState, useTransition } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { setVisibility } from "@/lib/actions/salons";

export function VisibilityToggle({
  salonId,
  isPublic,
}: {
  salonId: string;
  isPublic: boolean;
}) {
  const [pub, setPub] = useState(isPublic);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !pub;
    setPub(next); // optimistic
    startTransition(async () => {
      try {
        await setVisibility(salonId, next);
      } catch {
        setPub(!next); // revert on failure
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
      title={
        pub
          ? "Visible in the booking app. Note: the salon owner can also toggle this — admin changes are an override, last writer wins."
          : "Hidden from the booking app."
      }
    >
      {pub ? (
        <Eye size={14} weight="duotone" data-icon="inline-start" />
      ) : (
        <EyeSlash size={14} weight="duotone" data-icon="inline-start" />
      )}
      {pub ? "Public" : "Hidden"}
    </Button>
  );
}
