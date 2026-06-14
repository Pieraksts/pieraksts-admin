"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isActive } from "@/components/admin/nav-config";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-t border-hairline px-3 py-2 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-brand-soft text-brand-strong"
                : "text-ink-muted hover:bg-warm-strong hover:text-foreground",
            )}
          >
            <Icon size={16} weight={active ? "fill" : "regular"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
