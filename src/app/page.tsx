import Image from "next/image";
import {
  ArrowRight,
  Buildings,
  CalendarDots,
  FileText,
  Receipt,
  SealCheck,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const salons = [
  {
    name: "Beauty Studio Riga",
    status: "Active",
    statusClass: "border-brand-muted bg-brand-soft text-brand-strong",
    contract: "5% until 2026-12-31",
    uninvoiced: "EUR 62.00",
  },
  {
    name: "Nails & Co",
    status: "Negotiating",
    statusClass: "border-warm-border bg-warm-strong text-foreground",
    contract: "Draft pending",
    uninvoiced: "EUR 0.00",
  },
  {
    name: "Studio Lapa",
    status: "Paused",
    statusClass: "border-border bg-muted text-ink-muted",
    contract: "8% from 2027-01-01",
    uninvoiced: "EUR 18.50",
  },
];

const metrics = [
  {
    label: "Salon clients",
    value: "3",
    detail: "Commercial relationships tracked",
    icon: Buildings,
  },
  {
    label: "Uninvoiced fees",
    value: "EUR 80.50",
    detail: "Completed bookings awaiting invoice",
    icon: Receipt,
  },
  {
    label: "Open contracts",
    value: "1",
    detail: "Drafts or pending signatures",
    icon: FileText,
  },
];

const ledgerSteps = [
  { label: "Contract", value: "Versioned terms" },
  { label: "Bookings", value: "Fee snapshots" },
  { label: "Invoice", value: "Monthly PDF" },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="border-b border-hairline/80 bg-background/90">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="inline-flex items-center gap-3">
            <Image
              src="/brand/logo.png"
              alt="Pieraksts"
              width={36}
              height={36}
              priority
              className="rounded-full"
            />
            <div>
              <p className="eyebrow">Pieraksts</p>
              <p className="display-type text-[20px] font-extrabold leading-6 tracking-[-0.01em]">
                Admin
              </p>
            </div>
          </div>
          <Badge className="rounded-full border-brand-muted bg-brand-soft px-3 py-1.5 text-brand-strong">
            Internal ledger
          </Badge>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-8 sm:px-8 lg:py-12">
        <section className="mx-auto grid w-full max-w-5xl gap-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-brand-muted bg-brand-soft text-brand-strong">
            <SealCheck size={26} weight="duotone" />
          </div>
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow mb-4">Owner operations</p>
            <h1 className="display-type text-balance text-[42px] font-extrabold leading-[0.98] tracking-[-0.035em] text-foreground sm:text-[64px]">
              Contracts, fees, and invoices in one quiet workspace.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-[17px] leading-7 text-ink-muted">
              A private admin surface for Pieraksts owners to manage salon
              agreements, track completed-booking fees, and prepare monthly
              invoices without exposing commission data in the app.
            </p>
          </div>

          <div className="mx-auto grid w-full max-w-4xl gap-3 rounded-[28px] border border-warm-border bg-warm px-4 py-4 shadow-[0_24px_80px_rgba(35,34,32,0.06)] sm:grid-cols-3 sm:p-5">
            {ledgerSteps.map((step, index) => (
              <div
                key={step.label}
                className="relative rounded-[22px] border border-hairline bg-card px-5 py-4 text-left"
              >
                <p className="font-mono text-[11px] font-semibold text-brand">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="display-type mt-2 text-lg font-bold tracking-[-0.01em]">
                  {step.label}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{step.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card
                key={metric.label}
                className="rounded-[24px] border-warm-border bg-card px-1 py-1 shadow-none"
              >
                <CardHeader className="gap-4">
                  <div className="flex size-11 items-center justify-center rounded-full bg-warm-strong text-brand-strong">
                    <Icon size={22} weight="duotone" />
                  </div>
                  <div>
                    <CardDescription className="eyebrow">
                      {metric.label}
                    </CardDescription>
                    <CardTitle className="display-type mt-3 text-[31px] font-extrabold tracking-[-0.03em]">
                      {metric.value}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-[15px] text-ink-muted">
                  {metric.detail}
                </CardContent>
              </Card>
            );
          })}
        </section>

        <Card className="mx-auto w-full max-w-5xl rounded-[28px] border-warm-border bg-card px-1 py-1 shadow-[0_20px_70px_rgba(35,34,32,0.05)]">
          <CardHeader className="items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardDescription className="eyebrow">Salon clients</CardDescription>
              <CardTitle className="display-type mt-3 text-[28px] font-extrabold tracking-[-0.025em]">
                Commercial overview
              </CardTitle>
              <p className="mt-2 max-w-xl text-[15px] leading-6 text-ink-muted">
                The first real screen will list every salon client, their
                current contract, and the fees ready for invoice generation.
              </p>
            </div>
            <CardAction>
              <Button className="h-12 rounded-full bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-none hover:bg-primary-deep">
                Add salon
                <ArrowRight size={18} weight="bold" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[22px] border border-hairline">
              <Table>
                <TableHeader className="bg-warm-strong">
                  <TableRow className="hover:bg-warm-strong">
                    <TableHead className="h-14 pl-5 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      Salon
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      Current contract
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      Uninvoiced
                    </TableHead>
                    <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salons.map((salon) => (
                    <TableRow
                      key={salon.name}
                      className="h-[72px] hover:bg-warm/70"
                    >
                      <TableCell className="pl-5 font-semibold">
                        {salon.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-1.5 ${salon.statusClass}`}
                        >
                          {salon.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-ink-muted">
                        {salon.contract}
                      </TableCell>
                      <TableCell className="font-mono text-[14px] text-foreground">
                        {salon.uninvoiced}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-[14px] font-semibold text-brand-strong hover:bg-brand-soft hover:text-brand-strong"
                        >
                          Open
                          <ArrowRight size={16} weight="bold" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <section className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2">
          <Card className="rounded-[24px] border-warm-border bg-warm px-1 py-1 shadow-none">
            <CardHeader>
              <CalendarDots
                size={26}
                weight="duotone"
                className="text-brand-strong"
              />
              <CardTitle className="display-type text-[22px] font-extrabold tracking-[-0.02em]">
                Contract workflow
              </CardTitle>
              <CardDescription className="text-[15px] leading-6">
                Edit legal details, version commission terms, generate PDFs,
                and keep signed documents in private storage.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-[24px] border-warm-border bg-warm px-1 py-1 shadow-none">
            <CardHeader>
              <TrendUp
                size={26}
                weight="duotone"
                className="text-brand-strong"
              />
              <CardTitle className="display-type text-[22px] font-extrabold tracking-[-0.02em]">
                Monthly invoices
              </CardTitle>
              <CardDescription className="text-[15px] leading-6">
                Convert completed booking fees into invoice records, attach
                PDFs, and track sent or paid status.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
