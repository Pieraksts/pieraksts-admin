"use client";

import { useState } from "react";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAY_MS = 86_400_000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" for a year, zero-based month, and day. */
function toYMD(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayYMD(): string {
  const n = new Date();
  return toYMD(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Shift a {year, monthIndex} view by a number of months. */
function shiftMonth(v: { y: number; m: number }, delta: number) {
  const total = v.y * 12 + v.m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}

/**
 * On-brand date picker: a day calendar in a popover, themed with the same
 * tokens as the month picker. Value is a "YYYY-MM-DD" string (or "" when
 * empty), so it drops straight into the existing form state. `min` (inclusive
 * "YYYY-MM-DD") greys out earlier days; fixed-width strings compare with `<`.
 */
export function DatePicker({
  value,
  onChange,
  min,
  id,
  placeholder = "Select a date",
  clearable = false,
  ariaInvalid,
}: {
  value: string;
  onChange: (next: string) => void;
  min?: string;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  ariaInvalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const base = value || min || todayYMD();
  const [view, setView] = useState(() => ({
    y: Number(base.slice(0, 4)),
    m: Number(base.slice(5, 7)) - 1,
  }));

  // Re-centre the calendar on the current selection each time it opens.
  function handleOpenChange(next: boolean) {
    if (next) {
      const at = value || min || todayYMD();
      setView({ y: Number(at.slice(0, 4)), m: Number(at.slice(5, 7)) - 1 });
    }
    setOpen(next);
  }

  function select(ymd: string) {
    onChange(ymd);
    setOpen(false);
  }

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(view.y, view.m, 1)));

  // 42 cells (6 weeks) starting on the Monday on/before the 1st.
  const startWeekday = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const firstCell = Date.UTC(view.y, view.m, 1 - startWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(firstCell + i * DAY_MS);
    const ymd = toYMD(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
    return {
      ymd,
      day: dt.getUTCDate(),
      inMonth: dt.getUTCMonth() === view.m,
      disabled: min ? ymd < min : false,
      selected: ymd === value,
      today: ymd === todayYMD(),
    };
  });

  const todayDisabled = min ? todayYMD() < min : false;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={ariaInvalid ? "" : undefined}
          className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:border-ring data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:bg-input/30 dark:data-invalid:ring-destructive/40"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? formatDate(value) : placeholder}
          </span>
          <CalendarBlank size={15} weight="duotone" className="shrink-0 text-ink-soft" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[17.5rem]">
        <div className="mb-2 flex items-center justify-between">
          <span className="display-type text-[13px] font-bold text-foreground">
            {monthLabel}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setView((v) => shiftMonth(v, -1))}
            >
              <CaretLeft size={15} weight="bold" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setView((v) => shiftMonth(v, 1))}
            >
              <CaretRight size={15} weight="bold" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="flex h-7 items-center justify-center text-[10px] font-semibold tracking-[0.04em] text-ink-soft uppercase"
            >
              {w}
            </div>
          ))}
          {cells.map((c) => (
            <button
              key={c.ymd}
              type="button"
              disabled={c.disabled}
              aria-pressed={c.selected}
              aria-label={formatDate(c.ymd)}
              onClick={() => select(c.ymd)}
              className={cn(
                "flex size-8 items-center justify-center justify-self-center rounded-md text-[13px] tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                c.selected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : c.inMonth
                    ? "text-foreground hover:bg-warm-strong"
                    : "text-ink-soft/50 hover:bg-warm-strong",
                c.today &&
                  !c.selected &&
                  "ring-1 ring-brand-muted ring-inset",
                c.disabled &&
                  "opacity-30 hover:bg-transparent disabled:pointer-events-none",
              )}
            >
              {c.day}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-hairline pt-2">
          {clearable && value ? (
            <button
              type="button"
              className="rounded text-[12px] font-medium text-ink-muted outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={todayDisabled}
            className="rounded text-[12px] font-medium text-brand-strong outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
            onClick={() => select(todayYMD())}
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
