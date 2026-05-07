import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { EditInvestorForm } from "@/components/forms/edit-investor-form";

export const dynamic = "force-dynamic";

interface InvestorRow {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
}

export default async function EditarInversorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: invRaw } = await supabase
    .from("investors")
    .select("*")
    .eq("id", id)
    .single();
  if (!invRaw) notFound();
  const inv = invRaw as unknown as InvestorRow;

  return (
    <>
      <PageHeader
        title={`Editar ${inv.full_name}`}
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href={`/inversores/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver a la ficha
            </Link>
          </Button>
        }
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Datos del inversor</CardTitle>
        </CardHeader>
        <CardContent>
          <EditInvestorForm
            id={id}
            defaults={{
              full_name: inv.full_name,
              document_type: inv.document_type ?? "",
              document_number: inv.document_number ?? "",
              email: inv.email ?? "",
              phone: inv.phone ?? "",
              notes: inv.notes ?? "",
              is_active: inv.is_active,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
