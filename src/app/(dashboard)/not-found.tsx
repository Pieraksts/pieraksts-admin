import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="eyebrow">404</p>
      <h1 className="display-type text-[26px] font-extrabold tracking-[-0.02em]">
        Page not found
      </h1>
      <p className="max-w-md text-[15px] leading-6 text-ink-muted">
        That salon or page doesn&rsquo;t exist. It may have been removed or the
        link is wrong.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Back to overview</Link>
      </Button>
    </div>
  );
}
