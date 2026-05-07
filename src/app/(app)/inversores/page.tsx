import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import { listInvestorsWithStats } from "@/lib/supabase/queries/investors";

export const dynamic = "force-dynamic";

export default async function InversoresPage() {
  const investors = await listInvestorsWithStats();

  return (
    <>
      <PageHeader
        title="Inversores"
        subtitle={`${investors.length} ${investors.length === 1 ? "inversor cargado" : "inversores cargados"}`}
        actions={
          <Button asChild>
            <Link href="/inversores/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo inversor
            </Link>
          </Button>
        }
      />

      {investors.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">Todavía no hay inversores</div>
            <div className="max-w-sm text-xs text-ink-3">
              Cargá al primer cliente desde el botón superior, o pedile a Cafe+IA: &ldquo;Cargá un inversor llamado X&rdquo;.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                  <th className="px-5 py-2.5 text-left">Inversor</th>
                  <th className="px-5 py-2.5 text-right">Capital ARS</th>
                  <th className="px-5 py-2.5 text-right">Capital USD</th>
                  <th className="px-5 py-2.5 text-right">Tasa promedio</th>
                  <th className="px-5 py-2.5 text-right">Inversiones activas</th>
                  <th className="px-5 py-2.5 text-left">Estado</th>
                  <th className="px-5 py-2.5 text-left">Alta</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {investors.map((inv) => (
                  <tr
                    key={inv.id}
                    className="group transition-colors hover:bg-surface-2"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/inversores/${inv.id}`}
                        className="block font-semibold text-ink hover:text-brand-700"
                      >
                        {inv.full_name}
                      </Link>
                      {inv.email && (
                        <div className="text-xs text-ink-3">{inv.email}</div>
                      )}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-ink">
                      {inv.totalCapitalARS > 0
                        ? fmtMoney(inv.totalCapitalARS, "ARS")
                        : "—"}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-ink">
                      {inv.totalCapitalUSD > 0
                        ? fmtMoney(inv.totalCapitalUSD, "USD")
                        : "—"}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-ink-2">
                      {inv.weightedRate > 0 ? fmtPercent(inv.weightedRate) : "—"}
                    </td>
                    <td className="tabular px-5 py-3 text-right text-ink-2">
                      {inv.activeInvestments}
                    </td>
                    <td className="px-5 py-3">
                      {inv.is_active ? (
                        <Badge tone="success" dot>
                          Activo
                        </Badge>
                      ) : (
                        <Badge tone="neutral" dot>
                          Inactivo
                        </Badge>
                      )}
                    </td>
                    <td className="tabular px-5 py-3 text-xs text-ink-3">
                      {fmtDate(inv.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/inversores/${inv.id}`}
                        className="inline-flex items-center gap-1 text-xs text-ink-3 transition-colors group-hover:text-brand-700"
                      >
                        Ver ficha <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
