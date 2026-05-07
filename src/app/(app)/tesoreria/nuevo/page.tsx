import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CashCountForm } from "@/components/forms/cash-count-form";
import { listDenominations } from "@/lib/supabase/queries/treasury";

export const dynamic = "force-dynamic";

export default async function NuevoArqueoPage() {
  const denominations = await listDenominations();

  return (
    <>
      <PageHeader
        title="Nuevo arqueo de caja"
        subtitle="Cargá el conteo físico por denominación. Fajos × 100 + sueltos."
        actions={
          <Button variant="ghost" asChild size="sm">
            <Link href="/tesoreria">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        }
      />
      <CashCountForm denominations={denominations} />
    </>
  );
}
