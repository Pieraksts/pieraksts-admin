import Link from "next/link";
import { Receipt } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Invoices · Pieraksts Admin" };

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Invoices"
        description="Monthly commission invoices across all salons."
      />

      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-warm-border bg-card px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-warm-strong text-brand">
          <Receipt size={24} weight="duotone" />
        </span>
        <div className="max-w-sm">
          <h2 className="display-type text-[17px] font-bold tracking-[-0.01em]">
            No invoices yet
          </h2>
          <p className="mt-1.5 text-[14px] leading-6 text-ink-muted">
            Invoices are generated from completed-booking fees once a salon has
            an active contract. Start from a salon to review its fees.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/salons">Go to salons</Link>
        </Button>
      </div>
    </div>
  );
}
