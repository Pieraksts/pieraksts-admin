"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHORT = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
    new Date(Date.UTC(2000, i, 1)),
  ),
);

const LONG = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("en-GB", { month: "long" }).format(
    new Date(Date.UTC(2000, i, 1)),
  ),
);

/** "YYYY-MM" for a given year and zero-based month index. */
function ym(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/**
 * On-brand month picker: a year stepper over a 4×3 grid of months. Months past
 * `max` (inclusive "YYYY-MM") are disabled. Fixed-width zero-padded "YYYY-MM"
 * strings compare correctly with `<`/`>`, so no date math is needed to gate.
 */
export function MonthPicker({
  value,
  max,
  onChange,
  id,
}: {
  value: string;
  max: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const selectedYear = Number(value.slice(0, 4));
  const maxYear = Number(max.slice(0, 4));
  const [viewYear, setViewYear] = useState(selectedYear);

  return (
    <div
      id={id}
      className="rounded-lg border border-input bg-warm p-2"
      role="group"
      aria-label="Invoice month"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous year"
          onClick={() => setViewYear((y) => y - 1)}
        >
          <CaretLeft size={15} weight="bold" />
        </Button>
        <span className="display-type text-[14px] font-bold tabular-nums text-foreground">
          {viewYear}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Next year"
          disabled={viewYear >= maxYear}
          onClick={() => setViewYear((y) => y + 1)}
        >
          <CaretRight size={15} weight="bold" />
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {SHORT.map((label, i) => {
          const candidate = ym(viewYear, i);
          const disabled = candidate > max;
          const selected = candidate === value;
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${LONG[i]} ${viewYear}`}
              onClick={() => onChange(candidate)}
              className={cn(
                "h-9 rounded-md text-[13px] font-medium tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                selected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground hover:bg-warm-strong",
                disabled &&
                  "text-ink-soft opacity-40 hover:bg-transparent disabled:pointer-events-none",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
