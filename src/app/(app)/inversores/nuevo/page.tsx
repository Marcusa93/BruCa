"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createInvestorAction } from "@/lib/actions/investors";

export default function NuevoInversorPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <PageHeader
        title="Nuevo inversor"
        subtitle="Datos básicos del cliente o inversor"
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href="/inversores">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del inversor</CardTitle>
          <UserPlus className="h-4 w-4 text-ink-3" />
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => {
              setError(null);
              startTransition(async () => {
                const res = await createInvestorAction(formData);
                if (res?.error) setError(res.error);
                else router.push("/inversores");
              });
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Field label="Nombre completo" required className="sm:col-span-2">
              <Input name="full_name" required placeholder="Ej: Juan Pérez" />
            </Field>
            <Field label="Tipo de documento">
              <select
                name="document_type"
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">—</option>
                <option value="DNI">DNI</option>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
                <option value="PAS">Pasaporte</option>
              </select>
            </Field>
            <Field label="Número de documento">
              <Input name="document_number" placeholder="Ej: 30123456" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" placeholder="cliente@ejemplo.com" />
            </Field>
            <Field label="Teléfono">
              <Input name="phone" placeholder="Ej: +54 9 11 …" />
            </Field>
            <Field label="Notas" className="sm:col-span-2">
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="Observaciones internas (opcional)"
              />
            </Field>

            {error && (
              <div className="sm:col-span-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="secondary" asChild>
                <Link href="/inversores">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear inversor
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function Field({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
