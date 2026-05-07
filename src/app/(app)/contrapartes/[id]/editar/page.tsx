import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CounterpartyForm } from "@/components/forms/counterparty-form";

export const dynamic = "force-dynamic";

interface CpRow {
  id: string;
  full_name: string;
  alias: string | null;
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  bank: string | null;
  notes: string | null;
  risk_level: "low" | "normal" | "high";
  is_active: boolean;
}

export default async function EditarContrapartePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cpRaw } = await supabase
    .from("counterparties")
    .select("*")
    .eq("id", id)
    .single();
  if (!cpRaw) notFound();
  const cp = cpRaw as unknown as CpRow;

  return (
    <>
      <PageHeader
        title={`Editar ${cp.full_name}`}
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href={`/contrapartes/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos de la contraparte</CardTitle>
        </CardHeader>
        <CardContent>
          <CounterpartyForm
            id={id}
            defaults={{
              full_name: cp.full_name,
              alias: cp.alias ?? "",
              document_type: cp.document_type ?? "",
              document_number: cp.document_number ?? "",
              email: cp.email ?? "",
              phone: cp.phone ?? "",
              bank: cp.bank ?? "",
              notes: cp.notes ?? "",
              risk_level: cp.risk_level,
              is_active: cp.is_active,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
