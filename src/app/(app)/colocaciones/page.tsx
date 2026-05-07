import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlacementStatusBadge } from "@/components/ui/status-badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import { listOperations } from "@/lib/supabase/queries/operations";

export const dynamic = "force-dynamic";

const KIND_META: Record<string, { label: string; tint: string }> = {
  check_purchase: { label: "Cheque", tint: "bg-brand-50 text-brand-800" },
  fx_buy: { label: "Compra USD", tint: "bg-info-bg text-info" },
  fx_sell: { label: "Venta USD", tint: "bg-success-bg text-success" },
  crypto_buy: { label: "Compra USDT", tint: "bg-info-bg text-info" },
  crypto_sell: { label: "Venta USDT", tint: "bg-success-bg text-success" },
  other: { label: "Otro", tint: "bg-surface-2 text-ink-2" },
};

export default async function ColocacionesPage() {
  const operations = await listOperations();

  return (
    <>
      <PageHeader
        title="Colocaciones"
        subtitle={`${operations.length} operaciones registradas`}
        actions={
          <Button asChild>
            <Link href="/colocaciones/nueva">
              <Plus className="h-4 w-4" />
              Nueva colocación
            </Link>
          </Button>
        }
      />

      {operations.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">Todavía no hay colocaciones</div>
            <div className="max-w-sm text-xs text-ink-3">
              Cargá una compra de cheque, USD o USDT desde el botón superior, o hacelo desde Cafe+IA.
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2.5 text-left">Tipo</th>
                    <th className="px-5 py-2.5 text-left">Contraparte</th>
                    <th className="px-5 py-2.5 text-right">Monto</th>
                    <th className="px-5 py-2.5 text-right">Detalle</th>
                    <th className="px-5 py-2.5 text-right">Tasa / Spread</th>
                    <th className="px-5 py-2.5 text-right">Inicio</th>
                    <th className="px-5 py-2.5 text-right">Vencimiento</th>
                    <th className="px-5 py-2.5 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {operations.map((o) => {
                    const meta = KIND_META[o.kind] ?? KIND_META.other;
                    let detail = "—";
                    if (o.kind === "check_purchase" && o.expected_total) {
                      detail = `VN ${fmtMoney(Number(o.expected_total), o.currency)}`;
                    } else if (o.fx_trade) {
                      detail = `${o.fx_trade.units.toLocaleString("es-AR")} ${o.fx_trade.asset} × ${o.fx_trade.unit_price}`;
                    }
                    return (
                      <tr key={o.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.tint}`}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium text-ink">
                          {o.counterparty ?? "—"}
                        </td>
                        <td className="tabular px-5 py-3 text-right font-semibold text-ink">
                          {fmtMoney(Number(o.amount), o.currency)}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-2">
                          {detail}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-2">
                          {o.monthly_rate
                            ? fmtPercent(Number(o.monthly_rate))
                            : "—"}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-3">
                          {fmtDate(o.start_date)}
                        </td>
                        <td className="tabular px-5 py-3 text-right text-xs text-ink-3">
                          {o.due_date ? fmtDate(o.due_date) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <PlacementStatusBadge status={o.status} />
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
