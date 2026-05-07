"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Active = {
  kind: string;
  status: string;
  currency: string;
  q: string;
};

const KINDS = [
  { value: "all", label: "Todos" },
  { value: "check_purchase", label: "Cheques" },
  { value: "fx_buy", label: "Compra USD" },
  { value: "fx_sell", label: "Venta USD" },
  { value: "crypto_buy", label: "Compra USDT" },
  { value: "crypto_sell", label: "Venta USDT" },
];

const STATUSES = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activa" },
  { value: "near_due", label: "Por vencer" },
  { value: "overdue", label: "Vencida" },
  { value: "in_default", label: "En mora" },
  { value: "collected", label: "Cobrada" },
  { value: "reinvested", label: "Reinvertida" },
  { value: "cancelled", label: "Cancelada" },
];

const CURRENCIES = [
  { value: "all", label: "Todas" },
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

export function OperationsFilters({ active }: { active: Active }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(patch: Partial<Active>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all" || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.push(`?${next.toString()}`);
  }

  const hasFilters =
    active.kind !== "all" ||
    active.status !== "all" ||
    active.currency !== "all" ||
    active.q !== "";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 py-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
          <input
            placeholder="Buscar por contraparte…"
            value={active.q}
            onChange={(e) => update({ q: e.target.value })}
            className="h-9 w-full rounded-md border border-border bg-surface-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-brand-400 focus:bg-surface focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <Select
          label="Tipo"
          value={active.kind}
          onChange={(v) => update({ kind: v })}
          options={KINDS}
        />
        <Select
          label="Estado"
          value={active.status}
          onChange={(v) => update({ status: v })}
          options={STATUSES}
        />
        <Select
          label="Moneda"
          value={active.currency}
          onChange={(v) => update({ currency: v })}
          options={CURRENCIES}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(window.location.pathname)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-2"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-ink-3">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-ink-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
