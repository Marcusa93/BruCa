import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlacementStatusBadge } from "@/components/ui/status-badge";
import { fmtMoney, fmtDate, fmtDays } from "@/lib/finance/formatters";
import { daysUntil, type PlacementStatus } from "@/lib/finance/status";
import type { Currency } from "@/lib/finance/formatters";

export interface MaturityItem {
  id: string;
  counterparty: string;
  type: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  status: PlacementStatus;
}

export function MaturityList({ items }: { items: MaturityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos vencimientos</CardTitle>
        <span className="text-[11px] font-medium text-ink-3">
          {items.length} operaciones
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="divide-y divide-border">
          {items.map((item) => {
            const days = daysUntil(item.dueDate);
            return (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2"
              >
                <div className="col-span-4">
                  <div className="text-sm font-medium text-ink">{item.counterparty}</div>
                  <div className="text-xs text-ink-3">{item.type}</div>
                </div>
                <div className="col-span-3 tabular text-sm font-medium text-ink">
                  {fmtMoney(item.amount, item.currency)}
                </div>
                <div className="col-span-3">
                  <div className="tabular text-sm text-ink-2">{fmtDate(item.dueDate)}</div>
                  <div className="text-xs text-ink-4">{fmtDays(days)}</div>
                </div>
                <div className="col-span-2 flex justify-end">
                  <PlacementStatusBadge status={item.status} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
