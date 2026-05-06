import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TesoreriaPage() {
  return (
    <>
      <PageHeader
        title="Tesorería"
        subtitle="Arqueo de caja físico por denominación · ARS · USD · EUR · BRL"
      />
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-sm text-ink-3">
          Pantalla en construcción · cargá el arqueo del día y comparalo con el saldo teórico.
        </CardContent>
      </Card>
    </>
  );
}
