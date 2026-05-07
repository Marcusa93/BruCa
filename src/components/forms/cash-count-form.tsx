"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtMoney, type Currency } from "@/lib/finance/formatters";
import { createCashCountAction } from "@/lib/actions/treasury";

interface DenominationRow {
  id: string;
  currency: Currency;
  value: number;
  is_active: boolean;
}

interface LineState {
  bundles: number;
  loose: number;
  bundle_size: number;
}

export function CashCountForm({
  denominations,
}: {
  denominations: DenominationRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState<Record<string, LineState>>({});

  function update(id: string, patch: Partial<LineState>) {
    setCounts((prev) => ({
      ...prev,
      [id]: {
        bundles: prev[id]?.bundles ?? 0,
        loose: prev[id]?.loose ?? 0,
        bundle_size: prev[id]?.bundle_size ?? 100,
        ...patch,
      },
    }));
  }

  const grouped = useMemo(() => {
    const m = new Map<Currency, DenominationRow[]>();
    for (const d of denominations) {
      const arr = m.get(d.currency) ?? [];
      arr.push(d);
      m.set(d.currency, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => b.value - a.value);
    return m;
  }, [denominations]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const d of denominations) {
      const c = counts[d.id];
      if (!c) continue;
      const units = c.bundles * (c.bundle_size || 100) + c.loose;
      t[d.currency] = (t[d.currency] ?? 0) + units * d.value;
    }
    return t;
  }, [counts, denominations]);

  return (
    <form
      action={(formData) => {
        setError(null);
        // Append all line counts
        for (const [id, c] of Object.entries(counts)) {
          formData.append(`bundles_${id}`, String(c.bundles));
          formData.append(`loose_${id}`, String(c.loose));
          formData.append(`bundle_size_${id}`, String(c.bundle_size || 100));
        }
        startTransition(async () => {
          const res = await createCashCountAction(formData);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha del arqueo" required>
            <Input
              name="count_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </Field>
          <Field label="Notas">
            <Input name="notes" placeholder="Opcional" />
          </Field>
        </CardContent>
      </Card>

      {[...grouped.entries()].map(([currency, denoms]) => (
        <Card key={currency} className="mb-4">
          <CardHeader>
            <CardTitle>Conteo {currency}</CardTitle>
            <span className="tabular text-[11px] font-semibold text-ink">
              {fmtMoney(totals[currency] ?? 0, currency)}
            </span>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-surface-2 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  <th className="px-5 py-2 text-left">Denominación</th>
                  <th className="px-5 py-2 text-right">Fajos</th>
                  <th className="px-5 py-2 text-right">Tamaño fajo</th>
                  <th className="px-5 py-2 text-right">Sueltos</th>
                  <th className="px-5 py-2 text-right">Unidades</th>
                  <th className="px-5 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {denoms.map((d) => {
                  const c = counts[d.id] ?? { bundles: 0, loose: 0, bundle_size: 100 };
                  const units = c.bundles * (c.bundle_size || 100) + c.loose;
                  const subtotal = units * d.value;
                  return (
                    <tr key={d.id}>
                      <td className="tabular px-5 py-2 font-medium text-ink">
                        {fmtMoney(d.value, currency)}
                      </td>
                      <td className="px-5 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={c.bundles || ""}
                          onChange={(e) =>
                            update(d.id, { bundles: Number(e.target.value) || 0 })
                          }
                          className="h-7 w-20 text-right"
                        />
                      </td>
                      <td className="px-5 py-2">
                        <Input
                          type="number"
                          min="1"
                          value={c.bundle_size || 100}
                          onChange={(e) =>
                            update(d.id, {
                              bundle_size: Number(e.target.value) || 100,
                            })
                          }
                          className="h-7 w-20 text-right"
                        />
                      </td>
                      <td className="px-5 py-2">
                        <Input
                          type="number"
                          min="0"
                          value={c.loose || ""}
                          onChange={(e) =>
                            update(d.id, { loose: Number(e.target.value) || 0 })
                          }
                          className="h-7 w-20 text-right"
                        />
                      </td>
                      <td className="tabular px-5 py-2 text-right text-ink-2">
                        {units || 0}
                      </td>
                      <td className="tabular px-5 py-2 text-right font-semibold text-ink">
                        {subtotal > 0 ? fmtMoney(subtotal, currency) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {error && (
        <div className="mb-3 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" asChild>
          <Link href="/tesoreria">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar arqueo
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
