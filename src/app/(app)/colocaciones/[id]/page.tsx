import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlacementStatusBadge } from "@/components/ui/status-badge";
import { fmtMoney, fmtPercent, fmtDate, type Currency } from "@/lib/finance/formatters";
import type { PlacementStatus } from "@/lib/finance/status";
import { createClient } from "@/lib/supabase/server";
import { OperationActions } from "@/components/operations/operation-actions";
import { DeleteClient } from "@/components/operations/delete-client";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  check_purchase: "Cheque",
  fx_buy: "Compra USD",
  fx_sell: "Venta USD",
  crypto_buy: "Compra USDT",
  crypto_sell: "Venta USDT",
  other: "Otro",
};

interface OperationFull {
  id: string;
  kind: string;
  counterparty: string | null;
  currency: Currency;
  amount: number;
  start_date: string;
  due_date: string | null;
  monthly_rate: number | null;
  expected_return: number | null;
  expected_total: number | null;
  actual_return: number | null;
  status: PlacementStatus;
  notes: string | null;
}

interface CheckRow {
  drawer: string | null;
  bank: string | null;
  check_number: string | null;
  paid_amount: number;
  face_value: number;
  due_date: string;
}

interface FxTradeRow {
  side: "buy" | "sell";
  asset: string;
  unit_price: number;
  units: number;
}

export default async function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: opRaw, error } = await supabase
    .from("operations")
    .select("*, checks(*), fx_trades(*)")
    .eq("id", id)
    .single();
  if (error || !opRaw) notFound();
  const op = opRaw as unknown as OperationFull & {
    checks: CheckRow[] | null;
    fx_trades: FxTradeRow[] | null;
  };
  const check = op.checks?.[0] ?? null;
  const fx = op.fx_trades?.[0] ?? null;

  return (
    <>
      <PageHeader
        title={op.counterparty ?? KIND_LABEL[op.kind]}
        subtitle={`${KIND_LABEL[op.kind] ?? op.kind} · ${fmtDate(op.start_date)}${op.due_date ? ` → ${fmtDate(op.due_date)}` : ""}`}
        actions={
          <>
            <Button variant="ghost" asChild size="sm">
              <Link href="/colocaciones">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Link>
            </Button>
            <Button variant="secondary" size="md" asChild>
              <Link href={`/colocaciones/${id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
            <OperationActions
              id={id}
              status={op.status}
              expectedReturn={op.expected_return}
              amount={Number(op.amount)}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <PlacementStatusBadge status={op.status} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Tipo">{KIND_LABEL[op.kind] ?? op.kind}</Row>
            <Row label="Contraparte">{op.counterparty ?? "—"}</Row>
            <Row label="Monto operado">
              <span className="tabular font-semibold text-ink">
                {fmtMoney(Number(op.amount), op.currency)}
              </span>
            </Row>
            {op.expected_total != null && (
              <Row label="Total esperado">
                <span className="tabular text-ink">
                  {fmtMoney(Number(op.expected_total), op.currency)}
                </span>
              </Row>
            )}
            {op.expected_return != null && (
              <Row label="Rendimiento esperado">
                <span className="tabular text-success">
                  + {fmtMoney(Number(op.expected_return), op.currency)}
                </span>
              </Row>
            )}
            {op.actual_return != null && (
              <Row label="Rendimiento real">
                <span className="tabular text-success font-semibold">
                  + {fmtMoney(Number(op.actual_return), op.currency)}
                </span>
              </Row>
            )}
            {op.monthly_rate != null && (
              <Row label="Tasa mensual">
                <span className="tabular text-ink-2">
                  {fmtPercent(Number(op.monthly_rate))}
                </span>
              </Row>
            )}
            <Row label="Inicio">
              <span className="tabular">{fmtDate(op.start_date)}</span>
            </Row>
            {op.due_date && (
              <Row label="Vencimiento">
                <span className="tabular">{fmtDate(op.due_date)}</span>
              </Row>
            )}
          </CardContent>
        </Card>

        {check && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Datos del cheque</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="Librador">{check.drawer ?? "—"}</Row>
              <Row label="Banco">{check.bank ?? "—"}</Row>
              <Row label="Nº cheque">{check.check_number ?? "—"}</Row>
              <Row label="Vencimiento del cheque">
                <span className="tabular">{fmtDate(check.due_date)}</span>
              </Row>
              <Row label="Monto pagado">
                <span className="tabular">
                  {fmtMoney(Number(check.paid_amount), op.currency)}
                </span>
              </Row>
              <Row label="Valor nominal">
                <span className="tabular font-semibold">
                  {fmtMoney(Number(check.face_value), op.currency)}
                </span>
              </Row>
            </CardContent>
          </Card>
        )}

        {fx && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Datos de la operación</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <Row label="Lado">{fx.side === "buy" ? "Compra" : "Venta"}</Row>
              <Row label="Activo">{fx.asset}</Row>
              <Row label="Unidades">
                <span className="tabular">
                  {Number(fx.units).toLocaleString("es-AR")}
                </span>
              </Row>
              <Row label="Precio unitario (ARS)">
                <span className="tabular">
                  {Number(fx.unit_price).toLocaleString("es-AR")}
                </span>
              </Row>
              <Row label="Importe ARS">
                <span className="tabular font-semibold">
                  {fmtMoney(Number(op.amount), "ARS")}
                </span>
              </Row>
            </CardContent>
          </Card>
        )}

        {op.notes && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-ink-2">
              {op.notes}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <DeleteClient id={id} />
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0">
      <span className="text-xs text-ink-3">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
