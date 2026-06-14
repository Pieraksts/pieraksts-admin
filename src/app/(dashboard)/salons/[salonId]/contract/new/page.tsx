import { notFound } from "next/navigation";

import { ContractForm } from "@/components/admin/contract-form";
import { PageHeader } from "@/components/admin/page-header";
import { getSalon } from "@/lib/data/salons";

export default async function NewContractPage(
  props: PageProps<"/salons/[salonId]/contract/new">,
) {
  const { salonId } = await props.params;
  const salon = await getSalon(salonId);
  if (!salon) notFound();

  const nextVersion =
    salon.contracts.reduce((max, c) => Math.max(max, c.version), 0) + 1;
  const defaultRatePercent = salon.activeContract
    ? String(salon.activeContract.commissionRateBps / 100)
    : "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        backHref={`/salons/${salon.id}`}
        backLabel={salon.name}
        title="New contract"
        description="Draft a new versioned contract. Existing terms stay as history."
      />
      <ContractForm
        salonId={salon.id}
        salonName={salon.name}
        nextVersion={nextVersion}
        defaultRatePercent={defaultRatePercent}
      />
    </div>
  );
}
