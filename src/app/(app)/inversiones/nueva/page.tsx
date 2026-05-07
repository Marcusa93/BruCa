import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listInvestorsBasic } from "@/lib/supabase/queries/investments";
import { InvestmentForm } from "@/components/forms/investment-form";

export const dynamic = "force-dynamic";

export default async function NuevaInversionPage() {
  const investors = await listInvestorsBasic();

  return (
    <>
      <PageHeader
        title="Nueva inversión"
        subtitle="Cargá un aporte de capital recibido de un inversor"
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href="/inversiones">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del aporte</CardTitle>
        </CardHeader>
        <CardContent>
          {investors.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface-2 p-4 text-sm text-ink-3">
              Primero cargá un inversor en{" "}
              <Link href="/inversores/nuevo" className="font-medium text-brand-700 underline">
                Inversores → Nuevo
              </Link>
              .
            </div>
          ) : (
            <InvestmentForm investors={investors} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
