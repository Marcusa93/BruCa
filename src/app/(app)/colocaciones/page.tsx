import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ColocacionesPage() {
  return (
    <>
      <PageHeader
        title="Colocaciones"
        subtitle="Cheques, compraventa de moneda y cripto"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nueva colocación
          </Button>
        }
      />
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-sm text-ink-3">
          Pantalla en construcción.
        </CardContent>
      </Card>
    </>
  );
}
