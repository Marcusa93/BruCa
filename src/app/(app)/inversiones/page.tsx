import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import { listInvestments } from "@/lib/supabase/queries/investments";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "info" | "warning" | "danger" | "neutral" | "brand" }> = {
  active: { label: "Activa", tone: "info" },
  partially_placed: { label: "Colocada parcial", tone: "info" },
  fully_placed: { label: "Colocada", tone: "info" },
  returned: { label: "Devuelta", tone: "success" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export default async function InversionesPage() {
  const investments = await listInvestments();

  const totalARS = investments
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status) && i.currency === "ARS")
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalUSD = investments
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status) && i.currency === "USD")
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <>
      <PageHeader
        title="Inversiones recibidas"
        subtitle={`${investments.length} aportes · ${fmtMoney(totalARS, "ARS")}${totalUSD > 0 ? ` + ${fmtMoney(totalUSD, "USD")}` : ""} activos`}
        actions={
          <Button asChild>
            <Link href="/inversiones/nueva">
              <Plus className="h-4 w-4" />
              Nueva inversión
            </Link>
          </Button>
        }
      />

      {investments.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="text-sm font-medium text-ink">Todavía no hay inversiones</div>
            <div className="max-w-sm text-xs text-ink-3">
              Cargá el primer aporte de un inversor desde el botón superior, o pedile a Cafe+IA.
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
                  <th className="px-5 py-2.5 text-right">Capital</th>
                  <th className="px-5 py-2.5 text-right">Tasa mensual</th>
                  <th className="px-5 py-2.5 text-right">Plazo</th>
                  <th className="px-5 py-2.5 text-right">Ingreso</th>
                  <th className="px-5 py-2.5 text-right">Devolución comprometida</th>
                  <th className="px-5 py-2.5 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {investments.map((i) => {
                  const status = STATUS_LABEL[i.status] ?? {
                    label: i.status,
                    tone: "neutral" as const,
                  };
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
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
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
