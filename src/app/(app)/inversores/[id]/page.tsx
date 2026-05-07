import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Mail, Phone, FileText, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi/kpi-card";
import { InvestmentStatusBadge, PlacementStatusBadge } from "@/components/ui/status-badge";
import { PhoneWithWhatsApp } from "@/components/ui/whatsapp-link";
import {
  fmtMoney,
  fmtPercent,
  fmtDate,
  type Currency,
} from "@/lib/finance/formatters";
import { kindLabel } from "@/lib/finance/labels";
import type { InvestmentStatus } from "@/lib/finance/status";
import { getInvestorDetail } from "@/lib/supabase/queries/investors";

export const dynamic = "force-dynamic";

interface InvestmentRow {
  id: string;
  currency: Currency;
  amount: number;
  entry_date: string;
  estimated_term_days: number | null;
  monthly_rate: number;
  committed_return_amount: number | null;
  committed_return_date: string | null;
  status: string;
  notes: string | null;
}

interface OperationRow {
  id: string;
  kind: string;
  counterparty: string | null;
  currency: Currency;
  amount: number;
  start_date: string;
  due_date: string | null;
  status: string;
  expected_total: number | null;
}

interface LinkRow {
  investment_id: string;
  operation_id: string;
  allocated_amount: number;
}

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getInvestorDetail(id);
  if (!detail) notFound();

  const investments = (detail.investments ?? []) as unknown as InvestmentRow[];
  const operations = (detail.operations ?? []) as unknown as OperationRow[];
  const links = (detail.links ?? []) as unknown as LinkRow[];

  const totalARS = investments
    .filter((i) => i.currency === "ARS" && ["active", "partially_placed", "fully_placed"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalUSD = investments
    .filter((i) => i.currency === "USD" && ["active", "partially_placed", "fully_placed"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalAll = investments
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount), 0);
  const weightedRate =
    totalAll === 0
      ? 0
      : investments
          .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status))
          .reduce((s, i) => s + Number(i.amount) * Number(i.monthly_rate), 0) /
        totalAll;
  const expectedReturn = investments
    .filter((i) => i.committed_return_amount && ["active", "partially_placed", "fully_placed"].includes(i.status))
    .reduce(
      (s, i) =>
        s + (Number(i.committed_return_amount) - Number(i.amount)),
      0,
    );

  return (
    <>
      <PageHeader
        title={detail.investor.full_name}
        subtitle={
          detail.investor.is_active
            ? "Inversor activo"
            : "Inversor inactivo"
        }
        actions={
          <>
            <Button variant="ghost" asChild size="sm">
              <Link href="/inversores">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button variant="secondary" asChild size="md">
              <Link href={`/inversores/${id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Capital aportado"
          value={fmtMoney(totalARS, "ARS")}
          hint={totalUSD > 0 ? `+ ${fmtMoney(totalUSD, "USD")}` : "Sólo ARS"}
          accent="brand"
        />
        <KpiCard
          label="Tasa promedio"
          value={fmtPercent(weightedRate)}
          hint="Ponderada por capital activo"
        />
        <KpiCard
          label="Rendimiento comprometido"
          value={fmtMoney(expectedReturn, "ARS")}
          hint="Sumando todos los aportes activos"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          label="Inversiones cargadas"
          value={String(investments.length)}
          hint={`${investments.filter((i) => i.status === "active").length} activas`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Datos de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <ContactRow icon={<FileText className="h-3.5 w-3.5" />} label="Documento">
              {detail.investor.document_type
                ? `${detail.investor.document_type} ${detail.investor.document_number ?? "—"}`
                : detail.investor.document_number ?? "—"}
            </ContactRow>
            <ContactRow icon={<Mail className="h-3.5 w-3.5" />} label="Email">
              {detail.investor.email ?? "—"}
            </ContactRow>
            <ContactRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono">
              <PhoneWithWhatsApp phone={detail.investor.phone} />
            </ContactRow>
            {detail.investor.notes && (
              <div className="rounded-md border border-border bg-surface-2 p-2.5 text-xs text-ink-2">
                {detail.investor.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inversiones recibidas</CardTitle>
            <Badge tone="brand">{investments.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {investments.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-ink-3">
                Sin inversiones cargadas.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2 text-left">Ingreso</th>
                    <th className="px-5 py-2 text-right">Capital</th>
                    <th className="px-5 py-2 text-right">Tasa</th>
                    <th className="px-5 py-2 text-right">Plazo</th>
                    <th className="px-5 py-2 text-right">Devolución</th>
                    <th className="px-5 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {investments.map((i) => (
                    <tr key={i.id}>
                      <td className="tabular px-5 py-2.5 text-ink-2">
                        {fmtDate(i.entry_date)}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right font-semibold text-ink">
                        {fmtMoney(Number(i.amount), i.currency)}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink-2">
                        {fmtPercent(Number(i.monthly_rate))}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink-2">
                        {i.estimated_term_days ? `${i.estimated_term_days} d` : "—"}
                      </td>
                      <td className="tabular px-5 py-2.5 text-right text-ink">
                        {i.committed_return_amount
                          ? fmtMoney(Number(i.committed_return_amount), i.currency)
                          : "—"}
                        {i.committed_return_date && (
                          <div className="text-[10px] text-ink-4">
                            al {fmtDate(i.committed_return_date)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <InvestmentStatusBadge status={i.status as InvestmentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Operaciones financiadas con su capital</CardTitle>
            <Badge tone="brand">{operations.length}</Badge>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {operations.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-ink-3">
                Sin operaciones vinculadas.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-surface-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
                    <th className="px-5 py-2 text-left">Tipo</th>
                    <th className="px-5 py-2 text-left">Contraparte</th>
                    <th className="px-5 py-2 text-right">Asignado</th>
                    <th className="px-5 py-2 text-right">VN / Total</th>
                    <th className="px-5 py-2 text-right">Vencimiento</th>
                    <th className="px-5 py-2 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {operations.map((o) => {
                    const link = links.find((l) => l.operation_id === o.id);
                    return (
                      <tr key={o.id}>
                        <td className="px-5 py-2.5 text-ink-2">
                          {kindLabel(o.kind)}
                        </td>
                        <td className="px-5 py-2.5 text-ink">
                          {o.counterparty ?? "—"}
                        </td>
                        <td className="tabular px-5 py-2.5 text-right text-ink">
                          {link
                            ? fmtMoney(Number(link.allocated_amount), o.currency)
                            : "—"}
                        </td>
                        <td className="tabular px-5 py-2.5 text-right text-ink-2">
                          {o.expected_total
                            ? fmtMoney(Number(o.expected_total), o.currency)
                            : "—"}
                        </td>
                        <td className="tabular px-5 py-2.5 text-right text-ink-2">
                          {o.due_date ? fmtDate(o.due_date) : "—"}
                        </td>
                        <td className="px-5 py-2.5">
                          <PlacementStatusBadge status={o.status as Parameters<typeof PlacementStatusBadge>[0]["status"]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ContactRow({
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
