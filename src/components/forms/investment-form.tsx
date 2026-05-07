"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/finance/formatters";
import { expectedTotal, expectedReturn } from "@/lib/finance/calculations";
import { createInvestmentAction } from "@/lib/actions/investments";

export function InvestmentForm({
  investors,
}: {
  investors: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [currency, setCurrency] = useState("ARS");
  const [amount, setAmount] = useState(1_000_000);
  const [ratePct, setRatePct] = useState(4);
  const [days, setDays] = useState(30);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const preview = useMemo(() => {
    const ret = expectedReturn(amount, ratePct / 100, days);
    const total = expectedTotal(amount, ratePct / 100, days);
    const due = new Date(entryDate);
    due.setDate(due.getDate() + days);
    return {
      ret,
      total,
      due: due.toISOString().slice(0, 10),
    };
  }, [amount, ratePct, days, entryDate]);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await createInvestmentAction(formData);
          if (res?.error) setError(res.error);
          else router.push("/inversiones");
        });
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Field label="Inversor" required className="sm:col-span-2">
        <select
          name="investor_id"
          required
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Seleccionar…</option>
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
          min="0"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          required
        />
      </Field>

      <Field label="Tasa mensual (%)" required>
        <Input
          name="monthly_rate"
          type="number"
          step="0.1"
          min="0"
          value={ratePct}
          onChange={(e) => setRatePct(Number(e.target.value) || 0)}
          required
        />
      </Field>

      <Field label="Plazo (días)" required>
        <Input
          name="estimated_term_days"
          type="number"
          min="1"
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 0)}
          required
        />
      </Field>

      <Field label="Fecha de ingreso" required className="sm:col-span-2">
        <Input
          name="entry_date"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          required
        />
      </Field>

      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          placeholder="Observaciones (opcional)"
        />
      </Field>

      {/* Live preview */}
      <div className="sm:col-span-2 rounded-md border border-brand-100 bg-brand-50 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
          Cálculo automático
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <Line label="Rendimiento" value={fmtMoney(preview.ret, currency as never)} />
          <Line
            label="Devolución total"
            value={fmtMoney(preview.total, currency as never)}
            highlight
          />
          <Line
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

      <div className="sm:col-span-2 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" asChild>
          <Link href="/inversiones">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Cargar inversión
        </Button>
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

function Line({
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
