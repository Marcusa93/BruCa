import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  FileText,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi/kpi-card";
import { PlacementStatusBadge } from "@/components/ui/status-badge";
import { fmtMoney, fmtDate, fmtPercent, type Currency } from "@/lib/finance/formatters";
import type { PlacementStatus } from "@/lib/finance/status";
import { getCounterpartyDetail } from "@/lib/supabase/queries/counterparties";
import { PhoneWithWhatsApp } from "@/components/ui/whatsapp-link";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  check_purchase: "Cheque",
  fx_buy: "Compra USD",
  fx_sell: "Venta USD",
  crypto_buy: "Compra USDT",
  crypto_sell: "Venta USDT",
  other: "Otro",
};

const RISK_META: Record<
  "low" | "normal" | "high",
  {
    label: string;
    tone: "success" | "neutral" | "danger";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  low: { label: "Riesgo bajo", tone: "success", icon: ShieldCheck },
  normal: { label: "Riesgo normal", tone: "neutral", icon: Shield },
  high: { label: "Riesgo alto", tone: "danger", icon: ShieldAlert },
};

export default async function ContraparteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCounterpartyDetail(id);
  if (!detail) notFound();

  const cp = detail.counterparty;
  const ops = detail.operations;
  const RiskIcon = RISK_META[cp.risk_level].icon;

  // Métricas
  const totalBought = ops
    .filter((o) =>
      ["check_purchase", "fx_buy", "crypto_buy"].includes(o.kind),
    )
    .reduce((s, o) => s + Number(o.amount), 0);
  const pending = ops
    .filter(
      (o) =>
        o.kind === "check_purchase" &&
        ["active", "near_due", "overdue"].includes(o.status),
    )
    .reduce((s, o) => s + Number(o.expected_total ?? o.amount), 0);
  const collected = ops
    .filter((o) => o.status === "collected")
    .reduce(
      (s, o) => s + Number(o.actual_return ?? o.expected_return ?? 0),
      0,
    );
  const defaulted = ops
    .filter((o) => o.status === "in_default")
    .reduce((s, o) => s + Number(o.expected_total ?? o.amount), 0);

  return (
    <>
      <PageHeader
        title={cp.full_name}
        subtitle={
          [cp.alias && `alias “${cp.alias}”`, cp.bank]
            .filter(Boolean)
            .join(" · ") || "Contraparte"
        }
        actions={
          <>
            <Button variant="ghost" asChild size="sm">
              <Link href="/contrapartes">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button variant="secondary" size="md" asChild>
              <Link href={`/contrapartes/${id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Operaciones totales"
          value={String(ops.length)}
          hint={cp.is_active ? "Activa" : "Inactiva"}
          accent="brand"
        />
        <KpiCard
          label="Pagado total"
          value={fmtMoney(totalBought, "ARS")}
          hint="Compras a esta contraparte"
        />
        <KpiCard
          label="Pendiente de cobro"
          value={fmtMoney(pending, "ARS")}
          hint="Cheques activos"
        />
        <KpiCard
          label="Cobrado / mora"
          value={fmtMoney(collected, "ARS")}
          hint={
            defaulted > 0
              ? `${fmtMoney(defaulted, "ARS")} en mora`
              : "Sin mora"
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
            <Badge tone={RISK_META[cp.risk_level].tone} dot>
              <RiskIcon className="h-3 w-3" />
              {RISK_META[cp.risk_level].label}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <DataRow icon={<FileText className="h-3.5 w-3.5" />} label="Documento">
              {cp.document_type
                ? `${cp.document_type} ${cp.document_number ?? "—"}`
                : cp.document_number ?? "—"}
            </DataRow>
            <DataRow icon={<Building2 className="h-3.5 w-3.5" />} label="Banco">
              {cp.bank ?? "—"}
            </DataRow>
            <DataRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
              {cp.email ?? "—"}
            </DataRow>
            <DataRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
              <PhoneWithWhatsApp phone={cp.phone} />
            </DataRow>
            {cp.notes && (
              <div className="rounded-md border border-border bg-surface-2 p-2.5 text-xs text-ink-2">
                {cp.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Historial de operaciones</CardTitle>
            <Badge tone="brand">{ops.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {ops.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-ink-3">
                Sin operaciones cargadas con esta contraparte.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2 text-left">Tipo</th>
                    <th className="px-5 py-2 text-right">Monto</th>
                    <th className="px-5 py-2 text-right">VN / Total</th>
                    <th className="px-5 py-2 text-right">Tasa</th>
                    <th className="px-5 py-2 text-right">Fecha</th>
                    <th className="px-5 py-2 text-right">Vencimiento</th>
                    <th className="px-5 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ops.map((o) => (
                    <tr
                      key={o.id}
                      className="transition-colors hover:bg-surface-2"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/colocaciones/${o.id}`}
                          className="font-medium text-ink hover:text-brand-700"
                        >
                          {KIND_LABEL[o.kind] ?? o.kind}
                        </Link>
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink">
                        {fmtMoney(Number(o.amount), o.currency as Currency)}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink-2">
                        {o.expected_total
                          ? fmtMoney(Number(o.expected_total), o.currency as Currency)
                          : "—"}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink-2">
                        {o.monthly_rate
                          ? fmtPercent(Number(o.monthly_rate))
                          : "—"}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-xs text-ink-3">
                        {fmtDate(o.start_date)}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-xs text-ink-3">
                        {o.due_date ? fmtDate(o.due_date) : "—"}
                      </td>
                      <td className="px-5 py-2.5">
                        <PlacementStatusBadge
                          status={o.status as PlacementStatus}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DataRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-xs text-ink-3">
        {icon}
        {label}
      </span>
      <span className="text-sm text-ink">{children}</span>
    </div>
  );
}
