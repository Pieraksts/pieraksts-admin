"use client";

import { useState, useTransition } from "react";
import { Star } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { setFeatured } from "@/lib/actions/salons";

export function FeaturedToggle({
  salonId,
  isFeatured,
}: {
  salonId: string;
  isFeatured: boolean;
}) {
  const [featured, setFeaturedState] = useState(isFeatured);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !featured;
    setFeaturedState(next); // optimistic
    startTransition(async () => {
      try {
        await setFeatured(salonId, next);
      } catch {
        setFeaturedState(!next); // revert on failure
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
        featured
          ? "Sponsored — shown in the booking app's home Featured rail. Admin-only."
          : "Not featured. Toggle on to spotlight this salon in the booking app."
      }
    >
      <Star
        size={featured ? 16 : 14}
        weight={featured ? "fill" : "regular"}
        className={featured ? "text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.55)]" : ""}
        data-icon="inline-start"
      />
      {featured ? "Featured" : "Not featured"}
    </Button>
  );
}
