import Link from "next/link";
import { notFound } from "next/navigation";
import { Warning } from "@phosphor-icons/react/dist/ssr";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getSalon } from "@/lib/data/salons";

/**
 * `SUB-1` retired the commission/contract model as the launch commercial path.
 * A Salon's commercial relationship is now the provider-neutral Business
 * Subscription, so there is no longer a contract to draft here.
 *
 * The route is kept only so an existing bookmark lands on an explanation
 * instead of a 404. It has no form and no mutation.
 */
export default async function NewContractPage(
  props: PageProps<"/salons/[salonId]/contract/new">,
) {
  const { salonId } = await props.params;
  const salon = await getSalon(salonId);
  if (!salon) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        backHref={`/salons/${salon.id}`}
        backLabel={salon.name}
        title="Contracts are retired"
        description="The launch commercial model is the Business Subscription."
      />
      <div className="rounded-xl border border-hairline bg-card p-6">
        <div className="flex items-start gap-3">
          <Warning
            size={22}
            weight="duotone"
            className="mt-0.5 shrink-0 text-brand"
          />
          <div>
            <h2 className="display-type text-[17px] font-bold tracking-[-0.01em]">
              No new commission contracts
            </h2>
            <p className="mt-1.5 text-[14px] leading-6 text-ink-muted">
              {salon.name} is billed through its Business Subscription: a
              monthly offer with an included Billable Specialist allowance.
              Entitlement changes only from verified payment-provider events, so
              Admin cannot start, cancel, or repair it here.
            </p>
            <p className="mt-3 text-[14px] leading-6 text-ink-muted">
              Existing contracts stay readable on the salon page as history.
            </p>
            <div className="mt-4">
              <Button asChild size="sm">
                <Link href={`/salons/${salon.id}`}>Back to salon</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
