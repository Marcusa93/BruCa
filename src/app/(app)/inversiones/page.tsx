import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function InversionesPage() {
  return (
    <>
      <PageHeader
        title="Inversiones recibidas"
        subtitle="Capital aportado por inversores con devolución comprometida a fecha"
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Nueva inversión
          </Button>
        }
      />
      <Card>
        <CardContent className="flex h-64 items-center justify-center text-sm text-ink-3">
          Pantalla en construcción · cableo a Supabase próximamente.
        </CardContent>
      </Card>
    </>
  );
}
