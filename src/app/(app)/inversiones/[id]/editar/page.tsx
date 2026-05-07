import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listInvestorsBasic } from "@/lib/supabase/queries/investments";
import { EditInvestmentForm } from "@/components/forms/edit-investment-form";

export const dynamic = "force-dynamic";

interface InvestmentRow {
  id: string;
  investor_id: string;
  currency: "ARS" | "USD" | "EUR" | "BRL";
  amount: number;
  entry_date: string;
  estimated_term_days: number | null;
  monthly_rate: number;
  notes: string | null;
}

export default async function EditarInversionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: invRaw }, investors] = await Promise.all([
    supabase.from("investments").select("*").eq("id", id).single(),
    listInvestorsBasic(),
  ]);
  if (!invRaw) notFound();
  const inv = invRaw as unknown as InvestmentRow;

  return (
    <>
      <PageHeader
        title="Editar inversión"
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
          <CardTitle>Modificar datos</CardTitle>
        </CardHeader>
        <CardContent>
          <EditInvestmentForm
            id={id}
            investors={investors}
            defaults={{
              investor_id: inv.investor_id,
              currency: inv.currency,
              amount: Number(inv.amount),
              entry_date: inv.entry_date,
              estimated_term_days: inv.estimated_term_days ?? 30,
              monthly_rate: Number(inv.monthly_rate) * 100,
              notes: inv.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
