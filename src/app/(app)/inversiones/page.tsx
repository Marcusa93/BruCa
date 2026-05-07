import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvestmentStatusBadge } from "@/components/ui/status-badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import type { InvestmentStatus } from "@/lib/finance/status";
import { listInvestments, listInvestorsBasic } from "@/lib/supabase/queries/investments";
import { InvestmentsFilters } from "@/components/filters/investments-filters";

export const dynamic = "force-dynamic";

export default async function InversionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    investor?: string;
    status?: string;
    currency?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const [allInvestments, investorsList] = await Promise.all([
    listInvestments(),
    listInvestorsBasic(),
  ]);

  const filtered = allInvestments.filter((i) => {
    if (sp.investor && sp.investor !== "all" && i.investor_id !== sp.investor)
      return false;
    if (sp.status && sp.status !== "all" && i.status !== sp.status) return false;
    if (sp.currency && sp.currency !== "all" && i.currency !== sp.currency)
      return false;
    if (sp.q) {
      const q = sp.q.toLowerCase();
      if (!i.investor_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalARS = filtered
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status) && i.currency === "ARS")
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalUSD = filtered
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status) && i.currency === "USD")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <PageHeader
        title="Inversiones recibidas"
        subtitle={`${filtered.length} de ${allInvestments.length} aportes · ${fmtMoney(totalARS, "ARS")}${totalUSD > 0 ? ` + ${fmtMoney(totalUSD, "USD")}` : ""} activos`}
        actions={
          <Button asChild>
            <Link href="/inversiones/nueva">
              <Plus className="h-4 w-4" />
              Nueva inversión
            </Link>
          </Button>
        }
      />

      <InvestmentsFilters
        active={{
          investor: sp.investor ?? "all",
          status: sp.status ?? "all",
          currency: sp.currency ?? "all",
          q: sp.q ?? "",
        }}
        investors={investorsList}
      />

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">
              {allInvestments.length === 0
                ? "Todavía no hay inversiones"
                : "Sin coincidencias para los filtros"}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  <th className="px-5 py-2.5 text-left">Inversor</th>
                  <th className="px-5 py-2.5 text-right">Capital</th>
                  <th className="px-5 py-2.5 text-right">Tasa</th>
                  <th className="px-5 py-2.5 text-right">Plazo</th>
                  <th className="px-5 py-2.5 text-right">Ingreso</th>
                  <th className="px-5 py-2.5 text-right">Devolución</th>
                  <th className="px-5 py-2.5 text-left">Estado</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => {
                  return (
                    <tr key={i.id} className="transition-colors hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <Link
                          href={`/inversores/${i.investor_id}`}
                          className="font-semibold text-ink hover:text-brand-700"
                        >
                          {i.investor_name}
                        </Link>
                      </td>
                      <td className="tabular px-5 py-3 text-right font-semibold text-ink">
                        {fmtMoney(Number(i.amount), i.currency)}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink-2">
                        {fmtPercent(Number(i.monthly_rate))}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink-2">
                        {i.estimated_term_days ? `${i.estimated_term_days} d` : "—"}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink-2">
                        {fmtDate(i.entry_date)}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-ink">
                        {i.committed_return_amount
                          ? fmtMoney(Number(i.committed_return_amount), i.currency)
                          : "—"}
                        {i.committed_return_date && (
                          <div className="text-[10px] text-ink-4">
                            al {fmtDate(i.committed_return_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <InvestmentStatusBadge status={i.status as InvestmentStatus} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/inversiones/${i.id}/editar`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
