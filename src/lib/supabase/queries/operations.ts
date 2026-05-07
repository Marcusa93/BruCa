import { createClient } from "@/lib/supabase/server";
import type { PlacementStatus } from "@/lib/finance/status";
import type { Currency } from "@/lib/finance/formatters";

export interface OperationRow {
  id: string;
  kind: string;
  counterparty: string | null;
  currency: Currency;
  amount: number;
  start_date: string;
  due_date: string | null;
  monthly_rate: number | null;
  expected_return: number | null;
  expected_total: number | null;
  actual_return: number | null;
  status: PlacementStatus;
  notes: string | null;
  fx_trade?: {
    side: "buy" | "sell";
    asset: string;
    units: number;
    unit_price: number;
  } | null;
  check?: {
    drawer: string | null;
    bank: string | null;
    check_number: string | null;
    paid_amount: number;
    face_value: number;
    due_date: string;
  } | null;
}

export async function listOperations(): Promise<OperationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operations")
    .select(
      "id, kind, counterparty, currency, amount, start_date, due_date, monthly_rate, expected_return, expected_total, actual_return, status, notes, checks(drawer, bank, check_number, paid_amount, face_value, due_date), fx_trades(side, asset, units, unit_price)",
    )
    .order("start_date", { ascending: false });
  if (error) throw error;
  type Row = OperationRow & {
    checks: OperationRow["check"][] | null;
    fx_trades: OperationRow["fx_trade"][] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    check: r.checks?.[0] ?? null,
    fx_trade: r.fx_trades?.[0] ?? null,
  }));
}

export async function listMaturitiesByBucket() {
  const all = await listOperations();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const open = all.filter((o) => {
    return (
      o.due_date &&
      ["active", "near_due", "overdue", "in_default"].includes(o.status)
    );
  });

  const buckets: Record<string, typeof open> = {
    overdue: [],
    today: [],
    week: [],
    month: [],
    later: [],
  };

  for (const o of open) {
    const days = Math.floor(
      (Date.parse(o.due_date as string) - todayMs) / 86400000,
    );
    if (days < 0) buckets.overdue.push(o);
    else if (days === 0) buckets.today.push(o);
    else if (days <= 7) buckets.week.push(o);
    else if (days <= 30) buckets.month.push(o);
    else buckets.later.push(o);
  }
  return buckets;
}
