"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "pieraksts-theme";
const EVENT = "pieraksts-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  // The inline script in <head> sets the class before paint. We read the
  // resolved class via useSyncExternalStore so SSR stays consistent (false)
  // and the client re-syncs after hydration without a setState-in-effect.
  const dark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // ignore storage failures (private mode etc.)
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="text-ink-muted hover:text-foreground"
    >
      {dark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
    </Button>
  );
}
