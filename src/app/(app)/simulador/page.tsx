"use client";

import { useState, useMemo } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPercent, type Currency } from "@/lib/finance/formatters";
import { simulateReinvestment, simulateSinglePlacement } from "@/lib/finance/simulations";

export default function SimuladorPage() {
  const [capital, setCapital] = useState(1_000_000);
  const [ratePct, setRatePct] = useState(4);
  const [days, setDays] = useState(30);
  const [months, setMonths] = useState(6);
  const [reinvest, setReinvest] = useState(true);
  const [currency, setCurrency] = useState<Currency>("ARS");

  const single = useMemo(
    () => simulateSinglePlacement(capital, ratePct / 100, days),
    [capital, ratePct, days],
  );

  const series = useMemo(
    () => simulateReinvestment(capital, ratePct / 100, months, { reinvestInterest: reinvest }),
    [capital, ratePct, months, reinvest],
  );

  const finalCapital = series.length ? series[series.length - 1].endingCapital : capital;
  const totalInterest = series.reduce((s, x) => s + x.interest, 0);

  return (
    <>
      <PageHeader
        title="Simulador"
        subtitle="Proyección lineal · rendimiento = capital × tasa × días / 30"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Inputs */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Parámetros</CardTitle>
            <Calculator className="h-4 w-4 text-ink-3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Capital">
              <div className="flex">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="h-9 rounded-l-md border border-r-0 border-border bg-surface-2 px-2 text-sm font-medium text-ink-2"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
                <Input
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value) || 0)}
                  className="rounded-l-none"
                />
              </div>
            </Field>
            <Field label="Tasa mensual" suffix="%">
              <Input
                type="number"
                step="0.1"
                value={ratePct}
                onChange={(e) => setRatePct(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Plazo (días)">
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 0)}
              />
            </Field>
            <div className="border-t border-border pt-4">
              <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                Reinversión
              </div>
              <Field label="Períodos (meses)">
                <Input
                  type="number"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value) || 0)}
                />
              </Field>
              <label className="mt-3 flex cursor-pointer items-center justify-between rounded-md border border-border bg-surface-2 p-3">
                <span className="text-sm font-medium text-ink">Reinvertir intereses</span>
                <button
                  type="button"
                  onClick={() => setReinvest((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${reinvest ? "bg-brand-600" : "bg-border-strong"}`}
                  aria-pressed={reinvest}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${reinvest ? "translate-x-4" : "translate-x-0.5"}`}
                  />
                </button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultBlock
              label="Operación única"
              big={fmtMoney(single.total, currency)}
              hint={`Interés ${fmtMoney(single.interest, currency)} · ${days} días`}
              accent="brand"
            />
            <ResultBlock
              label={`Total al mes ${months}`}
              big={fmtMoney(finalCapital, currency)}
              hint={reinvest ? "Con reinversión de intereses" : "Sin reinversión"}
            />
            <ResultBlock
              label="Interés acumulado"
              big={fmtMoney(totalInterest, currency)}
              hint={`Tasa efectiva ${fmtPercent(totalInterest / capital)}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Proyección mes a mes</CardTitle>
              <Badge tone={reinvest ? "brand" : "neutral"}>
                {reinvest ? "Compone" : "Lineal"}
              </Badge>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                      <th className="px-5 py-2 text-left">Mes</th>
                      <th className="px-5 py-2 text-right">Capital inicial</th>
                      <th className="px-5 py-2 text-right">Interés</th>
                      <th className="px-5 py-2 text-right">Capital final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {series.map((s) => (
                      <tr key={s.month} className="transition-colors hover:bg-surface-2">
                        <td className="px-5 py-2.5 text-ink-2">{s.month}</td>
                        <td className="tabular px-5 py-2.5 text-right text-ink">
                          {fmtMoney(s.startingCapital, currency)}
                        </td>
                        <td className="tabular px-5 py-2.5 text-right text-success">
                          + {fmtMoney(s.interest, currency)}
                        </td>
                        <td className="tabular px-5 py-2.5 text-right font-semibold text-ink">
                          {fmtMoney(s.endingCapital, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-surface-2">
                      <td className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                        Total
                      </td>
                      <td />
                      <td className="tabular px-5 py-3 text-right text-sm font-semibold text-success">
                        {fmtMoney(totalInterest, currency)}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-sm font-semibold text-ink">
                        {fmtMoney(finalCapital, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  children,
  suffix,
}: {
  label: string;
  children: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {label}
        </label>
        {suffix && <span className="text-xs text-ink-4">{suffix}</span>}
      </div>
      {children}
    </div>
  );
}

function ResultBlock({
  label,
  big,
  hint,
  accent = "neutral",
}: {
  label: string;
  big: string;
  hint: string;
  accent?: "neutral" | "brand";
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-card">
      {accent === "brand" && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
          {label}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-ink-4" />
      </div>
      <div className="tabular mt-2 text-2xl font-semibold tracking-tight text-ink">{big}</div>
      <div className="mt-1 text-xs text-ink-3">{hint}</div>
    </div>
  );
}
