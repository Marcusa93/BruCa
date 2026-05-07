"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtPercent } from "@/lib/finance/formatters";
import { updateCheckAction, updateTradeAction } from "@/lib/actions/operations";

export function EditOperationForm({
  id,
  kind,
  counterparty,
  startDate,
  notes,
  check,
  fx,
}: {
  id: string;
  kind: string;
  counterparty: string;
  startDate: string;
  notes: string;
  check: {
    paid_amount: number;
    face_value: number;
    due_date: string;
    bank: string;
    check_number: string;
  } | null;
  fx: {
    side: "buy" | "sell";
    asset: string;
    units: number;
    unit_price: number;
  } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (kind === "check_purchase" && check) {
    return (
      <CheckEditor
        id={id}
        counterparty={counterparty}
        startDate={startDate}
        notes={notes}
        check={check}
        error={error}
        pending={pending}
        onSubmit={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await updateCheckAction(id, formData);
            if (res?.error) setError(res.error);
          });
        }}
      />
    );
  }
  if (fx) {
    return (
      <TradeEditor
        id={id}
        counterparty={counterparty}
        startDate={startDate}
        notes={notes}
        fx={fx}
        error={error}
        pending={pending}
        onSubmit={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await updateTradeAction(id, formData);
            if (res?.error) setError(res.error);
          });
        }}
      />
    );
  }
  return <div className="text-sm text-ink-3">Tipo de operación no editable.</div>;
}

function CheckEditor({
  id,
  counterparty,
  startDate,
  notes,
  check,
  error,
  pending,
  onSubmit,
}: {
  id: string;
  counterparty: string;
  startDate: string;
  notes: string;
  check: {
    paid_amount: number;
    face_value: number;
    due_date: string;
    bank: string;
    check_number: string;
  };
  error: string | null;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [paid, setPaid] = useState(check.paid_amount);
  const [face, setFace] = useState(check.face_value);
  const [start, setStart] = useState(startDate);
  const [due, setDue] = useState(check.due_date);

  const calc = useMemo(() => {
    const days = Math.max(0, (Date.parse(due) - Date.parse(start)) / 86400000);
    const ret = face - paid;
    const monthlyRate = paid > 0 && days > 0 ? (ret / paid) * (30 / days) : 0;
    return { days, ret, monthlyRate };
  }, [paid, face, start, due]);

  return (
    <form action={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Contraparte" required className="sm:col-span-2">
        <Input name="counterparty" defaultValue={counterparty} required />
      </Field>
      <Field label="Monto pagado" required>
        <Input
          name="paid_amount"
          type="number"
          step="0.01"
          required
          value={paid}
          onChange={(e) => setPaid(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Valor nominal" required>
        <Input
          name="face_value"
          type="number"
          step="0.01"
          required
          value={face}
          onChange={(e) => setFace(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Inicio" required>
        <Input
          name="start_date"
          type="date"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </Field>
      <Field label="Vencimiento" required>
        <Input
          name="due_date"
          type="date"
          required
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </Field>
      <Field label="Banco">
        <Input name="bank" defaultValue={check.bank} />
      </Field>
      <Field label="Nº de cheque">
        <Input name="check_number" defaultValue={check.check_number} />
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          defaultValue={notes}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      <div className="sm:col-span-2 rounded-md border border-brand-100 bg-brand-50 p-4 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Plazo" value={`${calc.days} días`} />
          <Stat label="Rendimiento" value={fmtMoney(calc.ret, "ARS")} />
          <Stat
            label="Tasa mensual"
            value={fmtPercent(calc.monthlyRate)}
            highlight
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
          <Link href={`/colocaciones/${id}`}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function TradeEditor({
  id,
  counterparty,
  startDate,
  notes,
  fx,
  error,
  pending,
  onSubmit,
}: {
  id: string;
  counterparty: string;
  startDate: string;
  notes: string;
  fx: { side: "buy" | "sell"; asset: string; units: number; unit_price: number };
  error: string | null;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}) {
  const [side, setSide] = useState(fx.side);
  const [asset, setAsset] = useState(fx.asset);
  const [units, setUnits] = useState(fx.units);
  const [price, setPrice] = useState(fx.unit_price);
  const amountARS = units * price;

  return (
    <form action={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Lado" required>
        <select
          name="side"
          value={side}
          onChange={(e) => setSide(e.target.value as "buy" | "sell")}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="buy">Compra</option>
          <option value="sell">Venta</option>
        </select>
      </Field>
      <Field label="Activo" required>
        <Input
          name="asset"
          required
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
      </Field>
      <Field label="Unidades" required>
        <Input
          name="units"
          type="number"
          step="0.0001"
          required
          value={units}
          onChange={(e) => setUnits(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Precio unitario (ARS)" required>
        <Input
          name="unit_price"
          type="number"
          step="0.0001"
          required
          value={price}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Contraparte">
        <Input name="counterparty" defaultValue={counterparty} />
      </Field>
      <Field label="Fecha" required>
        <Input name="date" type="date" required defaultValue={startDate} />
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          defaultValue={notes}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      <div className="sm:col-span-2 rounded-md border border-brand-100 bg-brand-50 p-4 text-sm">
        <Stat
          label={side === "buy" ? "Egreso ARS" : "Ingreso ARS"}
          value={fmtMoney(amountARS, "ARS")}
          highlight
        />
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      <div className="sm:col-span-2 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" asChild>
          <Link href={`/colocaciones/${id}`}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
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
