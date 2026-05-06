import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function VencimientosPage() {
  return (
    <>
      <PageHeader
        title="Agenda de vencimientos"
        subtitle="Hoy · esta semana · este mes · más adelante"
      />
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-sm text-ink-3">
          Pantalla en construcción.
        </CardContent>
      </Card>
    </>
  );
}
