import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CounterpartyForm } from "@/components/forms/counterparty-form";

export default function NuevaContrapartePage() {
  return (
    <>
      <PageHeader
        title="Nueva contraparte"
        subtitle="Persona o empresa con la que operás (vendedor de cheque, comprador de USD, etc.)"
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href="/contrapartes">
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
          <CounterpartyForm />
        </CardContent>
      </Card>
    </>
  );
}
