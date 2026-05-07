import Link from "next/link";
import { TrendingUp, Wallet, Banknote, Target, ArrowUpRight, Plus, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi/kpi-card";
import { MaturityList } from "@/components/dashboard/maturity-list";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { AllocationDonut } from "@/components/dashboard/allocation-donut";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtPercent, fmtDate } from "@/lib/finance/formatters";
import { getDashboardData } from "@/lib/supabase/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { kpis, allocation, maturities, commitments, alerts } = await getDashboardData();

  const allocationSlices = [
    { label: "Cheques activos", amount: allocation.cheques, color: "var(--color-brand-600)" },
    { label: "USDT / Cripto", amount: allocation.cryptoNet, color: "var(--color-brand-400)" },
    { label: "FX efectivo", amount: allocation.fxNet, color: "var(--color-brand-200)" },
    { label: "Disponible (caja)", amount: allocation.cash, color: "var(--color-border-strong)" },
  ];
  const totalARS = allocationSlices.reduce((s, x) => s + x.amount, 0);

  const placedRatio =
    kpis.capitalReceived.ARS > 0 ? kpis.capitalPlacedActive.ARS / kpis.capitalReceived.ARS : 0;

  return (
    <>
      <PageHeader
        title="Panorama operativo"
        subtitle="Capital colocado, vencimientos y rendimiento del período"
        actions={
          <>
            <Button variant="secondary" size="md" asChild>
              <Link href="/colocaciones">
                <ArrowUpRight className="h-4 w-4" />
                Ver operaciones
              </Link>
            </Button>
            <Button variant="primary" size="md" asChild>
              <Link href="/colocaciones/nueva">
                <Plus className="h-4 w-4" />
                Nueva operación
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          href="/inversiones"
          label="Capital recibido"
          value={fmtMoney(kpis.capitalReceived.ARS, "ARS")}
          hint={`${commitments.length} inversor${commitments.length === 1 ? "" : "es"} activo${commitments.length === 1 ? "" : "s"}`}
          accent="brand"
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          href="/colocaciones?kind=check_purchase"
          label="Capital colocado en cheques"
          value={fmtMoney(kpis.capitalPlacedActive.ARS, "ARS")}
          hint={`${fmtPercent(placedRatio)} del total recibido`}
          icon={<Target className="h-4 w-4" />}
        />
        <KpiCard
          href="/tesoreria"
          label="Capital en caja"
          value={fmtMoney(kpis.treasury.ARS, "ARS")}
          hint={kpis.treasury.USD > 0 ? `+ US$ ${kpis.treasury.USD.toLocaleString("es-AR")}` : "ARS · arqueo más reciente"}
          icon={<Banknote className="h-4 w-4" />}
        />
        <KpiCard
          href="/inversiones"
          label="Rendimiento esperado · mes"
          value={fmtMoney(kpis.expectedMonthlyReturn, "ARS")}
          hint={`A tasa promedio ${fmtPercent(kpis.weightedRate)} mensual`}
          accent="brand"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asignación de capital</CardTitle>
            <Badge tone="brand">ARS</Badge>
          </CardHeader>
          <CardContent>
            {totalARS > 0 ? (
              <AllocationDonut slices={allocationSlices} total={totalARS} currency="ARS" />
            ) : (
              <div className="py-8 text-center text-sm text-ink-3">Sin operaciones cargadas todavía.</div>
            )}
          </CardContent>
        </Card>
        {alerts.length > 0 ? (
          <AlertsPanel alerts={alerts} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Alertas operativas</CardTitle>
            </CardHeader>
            <CardContent className="flex h-32 items-center justify-center text-xs text-ink-3">
              Sin alertas — todo en orden.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {maturities.length > 0 ? (
            <MaturityList items={maturities} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Próximos vencimientos</CardTitle>
              </CardHeader>
              <CardContent className="flex h-32 items-center justify-center text-sm text-ink-3">
                No hay vencimientos cargados.
              </CardContent>
            </Card>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Compromisos a inversores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commitments.map((c) => (
              <Link
                key={c.investor + c.date}
                href={`/inversores/${c.investorId}`}
                className="group flex items-center justify-between rounded-md border border-border bg-surface-2 p-3 transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <div>
                  <div className="text-sm font-semibold text-ink group-hover:text-brand-800">
                    {c.investor}
                  </div>
                  <div className="text-xs text-ink-3">
                    Devolución comprometida · {fmtDate(c.date)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="tabular text-right text-sm font-semibold text-ink">
                    {fmtMoney(c.amount, c.currency)}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-ink-4 transition-colors group-hover:text-brand-700" />
                </div>
              </Link>
            ))}
            <div className="rounded-md border border-dashed border-border p-3 text-xs text-ink-3">
              Tasa promedio ponderada de devolución:{" "}
              <span className="tabular font-semibold text-ink">{fmtPercent(kpis.weightedRate)}</span> mensual
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
