import Link from "next/link";
import { Plus, Pencil, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlacementStatusBadge } from "@/components/ui/status-badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import {
  operationKindLabel,
  operationKindTint,
  type OperationKind,
} from "@/lib/finance/labels";
import { listOperations } from "@/lib/supabase/queries/operations";
import { OperationsFilters } from "@/components/filters/operations-filters";

export const dynamic = "force-dynamic";

export default async function ColocacionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    status?: string;
    currency?: string;
    q?: string;
  }>;
}) {
  const sp = await searchParams;
  const allOperations = await listOperations();

  const filtered = allOperations.filter((o) => {
    if (sp.kind && sp.kind !== "all" && o.kind !== sp.kind) return false;
    if (sp.status && sp.status !== "all" && o.status !== sp.status) return false;
    if (sp.currency && sp.currency !== "all" && o.currency !== sp.currency)
      return false;
    if (sp.q) {
      const q = sp.q.toLowerCase();
      const hay = (o.counterparty ?? "").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <PageHeader
        title="Colocaciones"
        subtitle={`${filtered.length} de ${allOperations.length} operaciones`}
        actions={
          <Button asChild>
            <Link href="/colocaciones/nueva">
              <Plus className="h-4 w-4" />
              Nueva colocación
            </Link>
          </Button>
        }
      />

      <OperationsFilters
        active={{
          kind: sp.kind ?? "all",
          status: sp.status ?? "all",
          currency: sp.currency ?? "all",
          q: sp.q ?? "",
        }}
      />

      {filtered.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">
              {allOperations.length === 0
                ? "Todavía no hay colocaciones"
                : "Sin coincidencias para los filtros aplicados"}
            </div>
            <div className="max-w-sm text-xs text-ink-3">
              {allOperations.length === 0
                ? "Cargá una compra de cheque, USD o USDT desde el botón superior."
                : "Probá ajustar los filtros o limpiarlos."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4">
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2.5 text-left">Tipo</th>
                    <th className="px-5 py-2.5 text-left">Contraparte</th>
                    <th className="px-5 py-2.5 text-right">Monto</th>
                    <th className="px-5 py-2.5 text-right">Detalle</th>
                    <th className="px-5 py-2.5 text-right">Tasa</th>
                    <th className="px-5 py-2.5 text-right">Inicio</th>
                    <th className="px-5 py-2.5 text-right">Vencimiento</th>
                    <th className="px-5 py-2.5 text-left">Estado</th>
                    <th className="px-5 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((o) => {
                    const kind = o.kind as OperationKind;
                    const label = operationKindLabel[kind] ?? operationKindLabel.other;
                    const tint = operationKindTint[kind] ?? operationKindTint.other;
                    let detail = "—";
                    if (o.kind === "check_purchase" && o.expected_total) {
                      detail = `VN ${fmtMoney(Number(o.expected_total), o.currency)}`;
                    } else if (o.fx_trade) {
                      detail = `${o.fx_trade.units.toLocaleString("es-AR")} ${o.fx_trade.asset} × ${o.fx_trade.unit_price}`;
                    }
                    return (
                      <tr
                        key={o.id}
                        className="cursor-pointer transition-colors hover:bg-surface-2"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/colocaciones/${o.id}`}
                            className="block"
                          >
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${tint}`}
                            >
                              {label}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 font-medium text-ink">
                          <Link
                            href={`/colocaciones/${o.id}`}
                            className="block hover:text-brand-700"
                          >
                            {o.counterparty ?? "—"}
                          </Link>
                        </td>
                        <td className="tabular px-5 py-3 text-right font-semibold text-ink">
                          <Link href={`/colocaciones/${o.id}`} className="block">
                            {fmtMoney(Number(o.amount), o.currency)}
                          </Link>
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-2">
                          <Link href={`/colocaciones/${o.id}`} className="block">
                            {detail}
                          </Link>
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-2">
                          <Link href={`/colocaciones/${o.id}`} className="block">
                            {o.monthly_rate
                              ? fmtPercent(Number(o.monthly_rate))
                              : "—"}
                          </Link>
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-3">
                          <Link href={`/colocaciones/${o.id}`} className="block">
                            {fmtDate(o.start_date)}
                          </Link>
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-3">
                          <Link href={`/colocaciones/${o.id}`} className="block">
                            {o.due_date ? fmtDate(o.due_date) : "—"}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <Link href={`/colocaciones/${o.id}`} className="block">
                            <PlacementStatusBadge status={o.status} />
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/colocaciones/${o.id}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                              aria-label="Ver detalle"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                              href={`/colocaciones/${o.id}/editar`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
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
