"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, FileCheck2, DollarSign, Bitcoin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtPercent } from "@/lib/finance/formatters";
import { createCheckAction, createTradeAction } from "@/lib/actions/operations";

type Tab = "check" | "fx" | "crypto";

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "check", label: "Cheque", icon: FileCheck2 },
  { id: "fx", label: "USD efectivo", icon: DollarSign },
  { id: "crypto", label: "USDT / Cripto", icon: Bitcoin },
];

interface CounterpartyOption {
  id: string;
  full_name: string;
  alias: string | null;
}

export function OperationForm({
  investments,
  counterparties,
}: {
  investments: Array<{ id: string; label: string }>;
  counterparties: CounterpartyOption[];
}) {
  const [tab, setTab] = useState<Tab>("check");

  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg border border-border bg-surface-2 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                tab === t.id
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "check" && (
        <CheckForm investments={investments} counterparties={counterparties} />
      )}
      {tab === "fx" && (
        <TradeForm flavor="fx" investments={investments} counterparties={counterparties} />
      )}
      {tab === "crypto" && (
        <TradeForm flavor="crypto" investments={investments} counterparties={counterparties} />
      )}
    </div>
  );
}

function CounterpartyField({
  counterparties,
  className,
}: {
  counterparties: CounterpartyOption[];
  className?: string;
}) {
  const [name, setName] = useState("");
  const matched = counterparties.find(
    (c) => c.full_name.toLowerCase() === name.trim().toLowerCase(),
  );
  return (
    <Field label="Contraparte" required className={className}>
      <input
        type="text"
        name="counterparty"
        list="counterparty-list"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Empezá a tipear o elegí de la lista"
        className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      <datalist id="counterparty-list">
        {counterparties.map((c) => (
          <option key={c.id} value={c.full_name}>
            {c.alias ? `(${c.alias})` : ""}
          </option>
        ))}
      </datalist>
      <input type="hidden" name="counterparty_id" value={matched?.id ?? ""} />
      {!matched && name.trim().length > 0 && (
        <div className="mt-1 text-[10px] text-ink-3">
          Si no existe, se crea automáticamente como contraparte nueva.
        </div>
      )}
    </Field>
  );
}

function CheckForm({
  investments,
  counterparties,
}: {
  investments: Array<{ id: string; label: string }>;
  counterparties: CounterpartyOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [paid, setPaid] = useState(0);
  const [face, setFace] = useState(0);
  const [start, setStart] = useState(today);
  const [due, setDue] = useState(in30);

  const calc = useMemo(() => {
    const days = Math.max(
      0,
      (Date.parse(due) - Date.parse(start)) / 86400000,
    );
    const ret = face - paid;
    const monthlyRate = paid > 0 && days > 0 ? (ret / paid) * (30 / days) : 0;
    return { days, ret, monthlyRate };
  }, [paid, face, start, due]);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await createCheckAction(formData);
          if (res?.error) setError(res.error);
          else router.push("/colocaciones");
        });
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <CounterpartyField counterparties={counterparties} className="sm:col-span-2" />
      <Field label="Monto pagado" required>
        <Input
          name="paid_amount"
          type="number"
          step="0.01"
          min="0"
          required
          value={paid || ""}
          onChange={(e) => setPaid(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Valor nominal (VN)" required>
        <Input
          name="face_value"
          type="number"
          step="0.01"
          min="0"
          required
          value={face || ""}
          onChange={(e) => setFace(Number(e.target.value) || 0)}
        />
      </Field>
      <Field label="Fecha de inicio" required>
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
        <Input name="bank" placeholder="Opcional" />
      </Field>
      <Field label="Nº de cheque">
        <Input name="check_number" placeholder="Opcional" />
      </Field>
      <Field label="Vincular a inversión" className="sm:col-span-2">
        <select
          name="attribute_to_investment_id"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Sin vincular</option>
          {investments.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>
      <input type="hidden" name="currency" value="ARS" />

      {/* Live preview */}
      <div className="sm:col-span-2 rounded-md border border-brand-100 bg-brand-50 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
          Cálculo automático
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <Line label="Plazo" value={`${calc.days} días`} />
          <Line label="Rendimiento" value={fmtMoney(calc.ret, "ARS")} />
          <Line
            label="Tasa mensual implícita"
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
          <Link href="/colocaciones">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Cargar cheque
        </Button>
      </div>
    </form>
  );
}

function TradeForm({
  flavor,
  investments,
  counterparties,
}: {
  flavor: "fx" | "crypto";
  investments: Array<{ id: string; label: string }>;
  counterparties: CounterpartyOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [units, setUnits] = useState(0);
  const [price, setPrice] = useState(0);
  const [asset, setAsset] = useState(flavor === "fx" ? "USD" : "USDT");
  const amountARS = units * price;

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const res = await createTradeAction(formData);
          if (res?.error) setError(res.error);
          else router.push("/colocaciones");
        });
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="flavor" value={flavor} />

      <Field label="Lado" required>
        <div className="flex gap-2">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "h-9 flex-1 rounded-md border text-sm font-medium transition-colors",
                side === s
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-border bg-surface text-ink-3 hover:bg-surface-2",
              )}
            >
              {s === "buy" ? "Compra" : "Venta"}
            </button>
          ))}
          <input type="hidden" name="side" value={side} />
        </div>
      </Field>

      <Field label={flavor === "fx" ? "Activo" : "Cripto"} required>
        <select
          name="asset"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {flavor === "fx" ? (
            <>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="BRL">BRL</option>
            </>
          ) : (
            <>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </>
          )}
        </select>
      </Field>

      <Field label="Unidades" required>
        <Input
          name="units"
          type="number"
          step="0.0001"
          min="0"
          required
          value={units || ""}
          onChange={(e) => setUnits(Number(e.target.value) || 0)}
        />
      </Field>

      <Field label="Precio unitario (ARS)" required>
        <Input
          name="unit_price"
          type="number"
          step="0.0001"
          min="0"
          required
          value={price || ""}
          onChange={(e) => setPrice(Number(e.target.value) || 0)}
        />
      </Field>

      <CounterpartyField counterparties={counterparties} />

      <Field label="Fecha" required>
        <Input name="date" type="date" required defaultValue={today} />
      </Field>

      {side === "buy" && (
        <Field label="Vincular a inversión" className="sm:col-span-2">
          <select
            name="attribute_to_investment_id"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">Sin vincular</option>
            {investments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Notas" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      <div className="sm:col-span-2 rounded-md border border-brand-100 bg-brand-50 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-700">
          Cálculo automático
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Line
            label={side === "buy" ? "Egreso ARS" : "Ingreso ARS"}
            value={fmtMoney(amountARS, "ARS")}
            highlight
          />
          <Line
            label={side === "buy" ? "Adquirís" : "Entregás"}
            value={`${units.toLocaleString("es-AR")} ${asset}`}
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
          <Link href="/colocaciones">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {flavor === "fx" ? "Cargar operación FX" : "Cargar operación cripto"}
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
