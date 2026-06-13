import { ArrowRight, Download, FileText, ReceiptText } from "lucide-react";

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
    contract: "5% until 2026-12-31",
    uninvoiced: "EUR 62.00",
  },
  {
    name: "Nails & Co",
    status: "Negotiating",
    contract: "Draft pending",
    uninvoiced: "EUR 0.00",
  },
  {
    name: "Studio Lapa",
    status: "Paused",
    contract: "8% from 2027-01-01",
    uninvoiced: "EUR 18.50",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Pieraksts
            </p>
            <h1 className="text-xl font-semibold">Admin</h1>
          </div>
          <Badge variant="secondary">Internal</Badge>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Salon Clients</CardTitle>
              <CardDescription>Commercial relationship status.</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">3</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Uninvoiced Fees</CardTitle>
              <CardDescription>Completed bookings awaiting invoice.</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">EUR 80.50</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Open Contracts</CardTitle>
              <CardDescription>Drafts or pending signatures.</CardDescription>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">1</CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Salons</CardTitle>
              <CardDescription>
                First screen for browsing Pieraksts salon clients.
              </CardDescription>
            </div>
            <CardAction>
              <Button>
                Add salon
                <ArrowRight className="size-4" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current contract</TableHead>
                  <TableHead>Uninvoiced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salons.map((salon) => (
                  <TableRow key={salon.name}>
                    <TableCell className="font-medium">{salon.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{salon.status}</Badge>
                    </TableCell>
                    <TableCell>{salon.contract}</TableCell>
                    <TableCell>{salon.uninvoiced}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Open
                        <ArrowRight className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <FileText className="size-5 text-muted-foreground" />
              <CardTitle>Contract Workflow</CardTitle>
              <CardDescription>
                Edit legal details, version commission terms, generate PDFs,
                and keep signed files in private storage.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <ReceiptText className="size-5 text-muted-foreground" />
              <CardTitle>Monthly Invoices</CardTitle>
              <CardDescription>
                Convert completed booking fees into invoice records, attach
                PDFs, and track sent or paid status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <Download className="size-4" />
                Download latest invoice
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
