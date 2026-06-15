import Link from "next/link";
import { notFound } from "next/navigation";
import { Warning } from "@phosphor-icons/react/dist/ssr";

import { ContractForm } from "@/components/admin/contract-form";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { getSalon, missingLegalFields } from "@/lib/data/salons";

export default async function NewContractPage(
  props: PageProps<"/salons/[salonId]/contract/new">,
) {
  const { salonId } = await props.params;
  const salon = await getSalon(salonId);
  if (!salon) notFound();

  const missing = missingLegalFields(salon.legalProfile);
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
      {missing.length > 0 ? (
        <div className="rounded-xl border border-hairline bg-card p-6">
          <div className="flex items-start gap-3">
            <Warning
              size={22}
              weight="duotone"
              className="mt-0.5 shrink-0 text-brand"
            />
            <div>
              <h2 className="display-type text-[17px] font-bold tracking-[-0.01em]">
                Complete the legal profile first
              </h2>
              <p className="mt-1.5 text-[14px] leading-6 text-ink-muted">
                A contract can&apos;t be drawn until {salon.name}&apos;s legal
                profile is complete. Still missing:
              </p>
              <ul className="mt-3 list-disc pl-5 text-[14px] text-foreground">
                {missing.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link href={`/salons/${salon.id}`}>
                    Back to salon to add it
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ContractForm
          salonId={salon.id}
          salonName={salon.name}
          nextVersion={nextVersion}
          defaultRatePercent={defaultRatePercent}
        />
      )}
    </div>
  );
}
