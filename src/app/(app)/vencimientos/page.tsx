import { PageHeader } from "@/components/layout/page-header";
import { MaturityBucket } from "@/components/vencimientos/maturity-bucket";
import { listMaturitiesByBucket } from "@/lib/supabase/queries/operations";

export const dynamic = "force-dynamic";

export default async function VencimientosPage() {
  const buckets = await listMaturitiesByBucket();

  const bucketsConfig: Array<{
    key: keyof typeof buckets;
    title: string;
    tone: "neutral" | "info" | "warning" | "danger" | "success";
  }> = [
    { key: "overdue", title: "Vencidas", tone: "danger" },
    { key: "today", title: "Hoy", tone: "warning" },
    { key: "week", title: "Esta semana (próximos 7 días)", tone: "warning" },
    { key: "month", title: "Este mes (8 a 30 días)", tone: "info" },
    { key: "later", title: "Más adelante (+30 días)", tone: "neutral" },
  ];

  const total = Object.values(buckets).reduce((s, arr) => s + arr.length, 0);

  return (
    <>
      <PageHeader
        title="Agenda de vencimientos"
        subtitle={`${total} operación${total === 1 ? "" : "es"} con vencimiento abierto`}
      />
      <div className="space-y-4">
        {bucketsConfig.map((b) => (
          <MaturityBucket
            key={b.key}
            title={b.title}
            tone={b.tone}
            items={buckets[b.key].map((o) => ({
              id: o.id,
              kind: o.kind,
              counterparty: o.counterparty,
              currency: o.currency,
              amount: Number(o.amount),
              expected_total: o.expected_total ? Number(o.expected_total) : null,
              due_date: o.due_date as string,
              status: o.status,
            }))}
          />
        ))}
      </div>
    </>
  );
}
