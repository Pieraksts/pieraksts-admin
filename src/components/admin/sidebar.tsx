"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, isActive } from "@/components/admin/nav-config";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-hairline bg-sidebar lg:flex">
      <Link
        href="/"
        className="flex h-16 items-center gap-2.5 px-5 outline-none focus-visible:bg-warm-strong"
      >
        <Image
          src="/brand/logo.png"
          alt=""
          width={30}
          height={30}
          priority
          className="rounded-full"
        />
        <span className="flex flex-col leading-none">
          <span className="display-type text-[15px] font-extrabold tracking-[-0.01em]">
            Pieraksts
          </span>
          <span className="eyebrow mt-1">Admin</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "bg-brand-soft text-brand-strong"
                  : "text-ink-muted hover:bg-warm-strong hover:text-foreground",
              )}
            >
              <Icon
                size={18}
                weight={active ? "fill" : "regular"}
                className="shrink-0"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-5 py-4 text-[11px] leading-4 text-ink-soft">
        Internal use only. Commission data stays out of the booking app.
      </p>
    </aside>
  );
}
