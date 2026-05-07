import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OperationForm } from "@/components/forms/operation-form";
import { listInvestments } from "@/lib/supabase/queries/investments";
import { listCounterpartiesBasic } from "@/lib/supabase/queries/counterparties";

export const dynamic = "force-dynamic";

export default async function NuevaColocacionPage() {
  const [investments, counterparties] = await Promise.all([
    listInvestments(),
    listCounterpartiesBasic(),
  ]);
  const activeInvestments = investments
    .filter((i) =>
      ["active", "partially_placed", "fully_placed"].includes(i.status),
    )
    .map((i) => ({
      id: i.id,
      label: `${i.investor_name} · ${i.amount.toLocaleString("es-AR", { style: "currency", currency: i.currency, maximumFractionDigits: 0 })}`,
    }));

  return (
    <>
      <PageHeader
        title="Nueva colocación"
        subtitle="Cargá una compra de cheque, una operación de moneda extranjera o una operación cripto"
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href="/colocaciones">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <OperationForm
            investments={activeInvestments}
            counterparties={counterparties}
          />
        </CardContent>
      </Card>
    </>
  );
}
