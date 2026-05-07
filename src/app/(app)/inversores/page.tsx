import Link from "next/link";
import { Plus, ChevronRight, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import { listInvestorsWithStats } from "@/lib/supabase/queries/investors";
import { InvestorsFilters } from "@/components/filters/investors-filters";

export const dynamic = "force-dynamic";

export default async function InversoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const all = await listInvestorsWithStats();

  const filtered = all.filter((inv) => {
    if (sp.q) {
      const q = sp.q.toLowerCase();
      if (
        !inv.full_name.toLowerCase().includes(q) &&
        !(inv.email ?? "").toLowerCase().includes(q) &&
        !(inv.document_number ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (sp.status === "active" && !inv.is_active) return false;
    if (sp.status === "inactive" && inv.is_active) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Inversores"
        subtitle={`${filtered.length} de ${all.length} ${all.length === 1 ? "inversor" : "inversores"}`}
        actions={
          <Button asChild>
            <Link href="/inversores/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo inversor
            </Link>
          </Button>
        }
      />

      <InvestorsFilters
        active={{ q: sp.q ?? "", status: sp.status ?? "all" }}
      />

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">
              {all.length === 0
                ? "Todavía no hay inversores"
                : "Sin coincidencias"}
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
                {filtered.map((inv) => (
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
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/inversores/${inv.id}/editar`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/inversores/${inv.id}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                          aria-label="Ver ficha"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
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
