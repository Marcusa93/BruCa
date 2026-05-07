import Link from "next/link";
import { Plus, ChevronRight, Pencil, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import { listCounterpartiesWithStats } from "@/lib/supabase/queries/counterparties";
import { CounterpartiesFilters } from "@/components/filters/counterparties-filters";

export const dynamic = "force-dynamic";

const RISK_TONE: Record<
  "low" | "normal" | "high",
  { label: string; tone: "success" | "neutral" | "danger" }
> = {
  low: { label: "Bajo", tone: "success" },
  normal: { label: "Normal", tone: "neutral" },
  high: { label: "Alto", tone: "danger" },
};

export default async function ContrapartesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; risk?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const all = await listCounterpartiesWithStats();

  const filtered = all.filter((c) => {
    if (sp.q) {
      const q = sp.q.toLowerCase();
      const hay = [
        c.full_name,
        c.alias,
        c.document_number,
        c.email,
        c.bank,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (sp.risk && sp.risk !== "all" && c.risk_level !== sp.risk) return false;
    if (sp.status === "active" && !c.is_active) return false;
    if (sp.status === "inactive" && c.is_active) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Contrapartes"
        subtitle={`${filtered.length} de ${all.length} contrapartes — vendedores de cheques, contrapartes de FX y USDT`}
        actions={
          <Button asChild>
            <Link href="/contrapartes/nueva">
              <Plus className="h-4 w-4" />
              Nueva contraparte
            </Link>
          </Button>
        }
      />

      <CounterpartiesFilters
        active={{
          q: sp.q ?? "",
          risk: sp.risk ?? "all",
          status: sp.status ?? "all",
        }}
      />

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">
              {all.length === 0
                ? "Todavía no hay contrapartes cargadas"
                : "Sin coincidencias"}
            </div>
            {all.length === 0 && (
              <div className="max-w-sm text-xs text-ink-3">
                Cuando cargues tu primera operación con contraparte, se va a
                crear automáticamente. También podés cargarlas manualmente
                desde el botón superior.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2.5 text-left">Contraparte</th>
                    <th className="px-5 py-2.5 text-right">Operaciones</th>
                    <th className="px-5 py-2.5 text-right">Pagado total</th>
                    <th className="px-5 py-2.5 text-right">Pendiente</th>
                    <th className="px-5 py-2.5 text-right">Mora</th>
                    <th className="px-5 py-2.5 text-right">Tasa promedio</th>
                    <th className="px-5 py-2.5 text-left">Riesgo</th>
                    <th className="px-5 py-2.5 text-left">Última op.</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const risk = RISK_TONE[c.risk_level];
                    return (
                      <tr
                        key={c.id}
                        className="group transition-colors hover:bg-surface-2"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/contrapartes/${c.id}`}
                            className="block font-semibold text-ink hover:text-brand-700"
                          >
                            {c.full_name}
                          </Link>
                          {c.alias && (
                            <div className="text-xs text-ink-3">
                              alias “{c.alias}”
                            </div>
                          )}
                          {c.bank && (
                            <div className="text-[10px] text-ink-4">{c.bank}</div>
                          )}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-ink-2">
                          {c.totalOperations}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-ink">
                          {c.totalBoughtARS > 0
                            ? fmtMoney(c.totalBoughtARS, "ARS")
                            : "—"}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-ink">
                          {c.pendingARS > 0 ? (
                            <span className="text-warning">
                              {fmtMoney(c.pendingARS, "ARS")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-ink">
                          {c.defaultedARS > 0 ? (
                            <span className="inline-flex items-center gap-1 text-danger">
                              <AlertCircle className="h-3 w-3" />
                              {fmtMoney(c.defaultedARS, "ARS")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-ink-2">
                          {c.averageMonthlyRate > 0
                            ? fmtPercent(c.averageMonthlyRate)
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={risk.tone} dot>
                            {risk.label}
                          </Badge>
                        </td>
                        <td className="tabular px-5 py-3 text-xs text-ink-3">
                          {c.lastOperationDate
                            ? fmtDate(c.lastOperationDate)
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/contrapartes/${c.id}/editar`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                              href={`/contrapartes/${c.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                              aria-label="Ver ficha"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
