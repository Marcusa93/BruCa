import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { EditOperationForm } from "@/components/forms/edit-operation-form";

export const dynamic = "force-dynamic";

interface OperationFull {
  id: string;
  kind: string;
  counterparty: string | null;
  amount: number;
  start_date: string;
  due_date: string | null;
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

export default async function EditOperationPage({
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
    kind: string;
    checks: CheckRow[] | null;
    fx_trades: FxTradeRow[] | null;
  };
  const check = op.checks?.[0] ?? null;
  const fx = op.fx_trades?.[0] ?? null;

  return (
    <>
      <PageHeader
        title="Editar operación"
        subtitle={op.counterparty ?? "—"}
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href={`/colocaciones/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver al detalle
            </Link>
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{op.kind === "check_purchase" ? "Datos del cheque" : "Datos de la operación"}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditOperationForm
            id={id}
            kind={op.kind}
            counterparty={op.counterparty ?? ""}
            startDate={op.start_date}
            notes={op.notes ?? ""}
            check={
              check
                ? {
                    paid_amount: Number(check.paid_amount),
                    face_value: Number(check.face_value),
                    due_date: check.due_date,
                    bank: check.bank ?? "",
                    check_number: check.check_number ?? "",
                  }
                : null
            }
            fx={
              fx
                ? {
                    side: fx.side,
                    asset: fx.asset,
                    units: Number(fx.units),
                    unit_price: Number(fx.unit_price),
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
