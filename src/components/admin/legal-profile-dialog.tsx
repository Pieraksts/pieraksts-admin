"use client";

import { useState, useTransition } from "react";
import { PencilSimple, Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveLegalProfile, type LegalProfileInput } from "@/lib/actions/salons";
import type { LegalProfile } from "@/lib/data/salons";

function toForm(p: LegalProfile | null): LegalProfileInput {
  return {
    companyName: p?.companyName ?? "",
    registrationNumber: p?.registrationNumber ?? "",
    vatNumber: p?.vatNumber ?? "",
    legalAddress: p?.legalAddress ?? "",
    contactPerson: p?.contactPerson ?? "",
    billingEmail: p?.billingEmail ?? "",
    billingPhone: p?.billingPhone ?? "",
  };
}

export function LegalProfileDialog({
  salonId,
  profile,
}: {
  salonId: string;
  profile: LegalProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LegalProfileInput>(() => toForm(profile));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    if (next) setForm(toForm(profile)); // reset to latest data on open
    setError(null);
    setOpen(next);
  }

  function bind(key: keyof LegalProfileInput) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveLegalProfile(salonId, form);
        setOpen(false);
      } catch {
        setError("Could not save the legal profile. Please try again.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {profile ? (
          <Button variant="ghost" size="sm">
            <PencilSimple size={14} data-icon="inline-start" />
            Edit
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus size={14} data-icon="inline-start" />
            Add legal profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Legal profile</DialogTitle>
          <DialogDescription>
            Company name, registration number, legal address, and contact are
            required before a contract can be drawn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Company name" required>
            <Input {...bind("companyName")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration number" required>
              <Input {...bind("registrationNumber")} />
            </Field>
            <Field label="VAT number">
              <Input {...bind("vatNumber")} />
            </Field>
          </div>
          <Field label="Legal address" required>
            <Input {...bind("legalAddress")} />
          </Field>
          <Field label="Contact person" required>
            <Input {...bind("contactPerson")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Billing email">
              <Input type="email" {...bind("billingEmail")} />
            </Field>
            <Field label="Billing phone">
              <Input {...bind("billingPhone")} />
            </Field>
          </div>
          {error ? (
            <p className="text-[13px] text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
