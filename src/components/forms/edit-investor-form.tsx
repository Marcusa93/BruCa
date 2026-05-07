"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateInvestorAction,
  deleteInvestorAction,
  toggleInvestorActiveAction,
} from "@/lib/actions/investors";

interface Defaults {
  full_name: string;
  document_type: string;
  document_number: string;
  email: string;
  phone: string;
  notes: string;
  is_active: boolean;
}

export function EditInvestorForm({
  id,
  defaults,
}: {
  id: string;
  defaults: Defaults;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [active, setActive] = useState(defaults.is_active);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await updateInvestorAction(id, formData);
          if (res?.error) setError(res.error);
          else router.push(`/inversores/${id}`);
        });
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Nombre completo" required className="sm:col-span-2">
        <Input name="full_name" required defaultValue={defaults.full_name} />
      </Field>
      <Field label="Tipo de documento">
        <select
          name="document_type"
          defaultValue={defaults.document_type}
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
        <Input name="document_number" defaultValue={defaults.document_number} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={defaults.email} />
      </Field>
      <Field label="Teléfono">
        <Input name="phone" defaultValue={defaults.phone} />
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults.notes}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      <Field label="Estado del inversor" className="sm:col-span-2">
        <label className="flex items-center justify-between rounded-md border border-border bg-surface-2 p-3">
          <span className="text-sm text-ink">
            {active ? "Activo" : "Inactivo"}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = !active;
              setActive(next);
              startTransition(async () => {
                await toggleInvestorActiveAction(id, next);
              });
            }}
            disabled={pending}
            className={`relative h-5 w-9 rounded-full transition-colors ${active ? "bg-brand-600" : "bg-border-strong"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </label>
      </Field>

      {error && (
        <div className="sm:col-span-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-danger hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar inversor
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-1.5 text-xs text-danger">
            <AlertTriangle className="h-3.5 w-3.5" />
            ¿Confirmás?
            <Button
              variant="danger"
              size="sm"
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const res = await deleteInvestorAction(id);
                  if (res?.error) setError(res.error);
                  else router.push("/inversores");
                });
              }}
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Sí, eliminar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setConfirming(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href={`/inversores/${id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </form>
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
