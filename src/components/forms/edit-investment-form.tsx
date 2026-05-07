"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/finance/formatters";
import { expectedReturn, expectedTotal } from "@/lib/finance/calculations";
import {
  updateInvestmentAction,
  deleteInvestmentAction,
} from "@/lib/actions/investments";

interface Defaults {
  investor_id: string;
  currency: string;
  amount: number;
  entry_date: string;
  estimated_term_days: number;
  monthly_rate: number;
  notes: string;
}

export function EditInvestmentForm({
  id,
  investors,
  defaults,
}: {
  id: string;
  investors: { id: string; full_name: string }[];
  defaults: Defaults;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [currency, setCurrency] = useState(defaults.currency);
  const [amount, setAmount] = useState(defaults.amount);
  const [ratePct, setRatePct] = useState(defaults.monthly_rate);
  const [days, setDays] = useState(defaults.estimated_term_days);
  const [entryDate, setEntryDate] = useState(defaults.entry_date);

  const preview = useMemo(() => {
    const ret = expectedReturn(amount, ratePct / 100, days);
    const total = expectedTotal(amount, ratePct / 100, days);
    const due = new Date(entryDate);
    due.setDate(due.getDate() + days);
    return { ret, total, due: due.toISOString().slice(0, 10) };
  }, [amount, ratePct, days, entryDate]);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await updateInvestmentAction(id, formData);
          if (res?.error) setError(res.error);
        });
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Inversor" required className="sm:col-span-2">
        <select
          name="investor_id"
          required
          defaultValue={defaults.investor_id}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {investors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.full_name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Moneda" required>
        <select
          name="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="BRL">BRL</option>
        </select>
      </Field>
      <Field label="Monto" required>
        <Input
          name="amount"
          type="number"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Tasa mensual (%)" required>
        <Input
          name="monthly_rate"
          type="number"
          step="0.1"
          required
          value={ratePct}
          onChange={(e) => setRatePct(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Plazo (días)" required>
        <Input
          name="estimated_term_days"
          type="number"
          required
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Fecha de ingreso" required className="sm:col-span-2">
        <Input
          name="entry_date"
          type="date"
          required
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
        />
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults.notes}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      <div className="sm:col-span-2 rounded-md border border-brand-100 bg-brand-50 p-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Stat label="Rendimiento" value={fmtMoney(preview.ret, currency as never)} />
          <Stat
            label="Devolución total"
            value={fmtMoney(preview.total, currency as never)}
            highlight
          />
          <Stat
            label="Vencimiento"
            value={new Date(preview.due).toLocaleDateString("es-AR")}
          />
        </div>
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-danger hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar inversión
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
                startTransition(async () => {
                  const res = await deleteInvestmentAction(id);
                  if (res?.error) setError(res.error);
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
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href="/inversiones">Cancelar</Link>
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

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div
        className={`tabular ${highlight ? "text-base font-semibold text-brand-800" : "text-sm font-medium text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}
