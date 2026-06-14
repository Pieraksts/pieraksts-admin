import Image from "next/image";
import Link from "next/link";
import { UserCircle } from "@phosphor-icons/react/dist/ssr";

import { MobileNav } from "@/components/admin/mobile-nav";
import { ThemeToggle } from "@/components/admin/theme-toggle";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand shows on mobile only; desktop has it in the sidebar. */}
        <Link href="/" className="flex items-center gap-2.5 lg:hidden">
          <Image
            src="/brand/logo.png"
            alt=""
            width={28}
            height={28}
            priority
            className="rounded-full"
          />
          <span className="display-type text-[15px] font-extrabold tracking-[-0.01em]">
            Pieraksts
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {/* Placeholder for the eventual signed-in owner. No auth yet. */}
          <span className="flex items-center gap-2 rounded-full border border-hairline bg-warm-strong py-1 pr-3 pl-1.5 text-[13px] font-medium text-ink-muted">
            <UserCircle size={20} weight="duotone" className="text-brand" />
            Owner
          </span>
        </div>
      </div>
      <MobileNav />
    </header>
  );
}
