import Link from "next/link";
import { Plus, Banknote, Scale } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi/kpi-card";
import { fmtMoney, fmtDate, type Currency } from "@/lib/finance/formatters";
import {
  getLatestCashCount,
  getTheoreticalBalance,
  listCashCounts,
} from "@/lib/supabase/queries/treasury";

export const dynamic = "force-dynamic";

export default async function TesoreriaPage() {
  const [latest, theoretical, history] = await Promise.all([
    getLatestCashCount(),
    getTheoreticalBalance(),
    listCashCounts(10),
  ]);

  // Agrupar líneas por moneda
  const byCurrency: Record<string, typeof latest extends null ? [] : NonNullable<typeof latest>["lines"]> = {};
  if (latest) {
    for (const line of latest.lines) {
      (byCurrency[line.currency] ??= []).push(line);
    }
  }

  const currencies: Currency[] = ["ARS", "USD", "EUR", "BRL"];

  return (
    <>
      <PageHeader
        title="Tesorería"
        subtitle={
          latest
            ? `Último arqueo · ${fmtDate(latest.cashCount.count_date)}`
            : "Sin arqueos cargados todavía"
        }
        actions={
          <Button asChild>
            <Link href="/tesoreria/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo arqueo
            </Link>
          </Button>
        }
      />

      {/* Totales por moneda */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {currencies.map((c) => {
          const arq = latest?.totals[c] ?? 0;
          const teo = theoretical[c] ?? 0;
          const diff = arq - teo;
          if (arq === 0 && teo === 0) return null;
          return (
            <KpiCard
              key={c}
              label={`Caja ${c}`}
              value={fmtMoney(arq, c)}
              hint={
                teo === 0
                  ? "Sin saldo teórico calculado"
                  : `Teórico ${fmtMoney(teo, c)} · diferencia ${fmtMoney(diff, c)}`
              }
              accent={c === "ARS" ? "brand" : "neutral"}
              icon={c === "ARS" ? <Banknote className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
            />
          );
        })}
      </div>

      {/* Detalle del arqueo */}
      {latest ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {currencies
            .filter((c) => byCurrency[c]?.length > 0)
            .map((c) => (
              <Card key={c}>
                <CardHeader>
                  <CardTitle>Detalle {c}</CardTitle>
                  <span className="tabular text-[11px] font-semibold text-ink-3">
                    {fmtMoney(latest.totals[c] ?? 0, c)}
                  </span>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border bg-surface-2 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                        <th className="px-5 py-2 text-left">Denominación</th>
                        <th className="px-5 py-2 text-right">Fajos</th>
                        <th className="px-5 py-2 text-right">Sueltos</th>
                        <th className="px-5 py-2 text-right">Unidades</th>
                        <th className="px-5 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {byCurrency[c]
                        .sort((a, b) => Number(b.value) - Number(a.value))
                        .map((l) => (
                          <tr key={l.id}>
                            <td className="tabular px-5 py-2 text-ink">
                              {fmtMoney(Number(l.value), c)}
                            </td>
                            <td className="tabular px-5 py-2 text-right text-ink-2">
                              {l.bundles}
                            </td>
                            <td className="tabular px-5 py-2 text-right text-ink-2">
                              {l.loose}
                            </td>
                            <td className="tabular px-5 py-2 text-right text-ink-2">
                              {l.total_units}
                            </td>
                            <td className="tabular px-5 py-2 text-right font-semibold text-ink">
                              {fmtMoney(l.line_total, c)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : (
        <Card className="mt-4">
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">Aún no cargaste un arqueo</div>
            <div className="max-w-sm text-xs text-ink-3">
              Cargá el conteo físico de billetes (fajos × 100 + sueltos) para ver el saldo real
              de caja y compararlo contra el saldo teórico.
            </div>
            <Button asChild size="sm">
              <Link href="/tesoreria/nuevo">
                <Plus className="h-4 w-4" />
                Cargar primer arqueo
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {history.length > 1 && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de arqueos</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2 text-left">Fecha</th>
                    <th className="px-5 py-2 text-left">Notas</th>
                    <th className="px-5 py-2 text-right">Cargado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td className="tabular px-5 py-2 text-ink">
                        {fmtDate(h.count_date)}
                      </td>
                      <td className="px-5 py-2 text-xs text-ink-2">
                        {h.notes ?? "—"}
                      </td>
                      <td className="tabular px-5 py-2 text-right text-xs text-ink-3">
                        {fmtDate(h.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
