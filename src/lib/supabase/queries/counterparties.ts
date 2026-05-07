import { createClient } from "@/lib/supabase/server";

export interface CounterpartyRow {
  id: string;
  full_name: string;
  alias: string | null;
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  bank: string | null;
  notes: string | null;
  risk_level: "low" | "normal" | "high";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CounterpartyWithStats extends CounterpartyRow {
  totalOperations: number;
  totalBoughtARS: number;
  totalSoldARS: number;
  pendingARS: number; // cheques activos sin cobrar
  defaultedARS: number; // operaciones en mora
  collectedARS: number;
  lastOperationDate: string | null;
  averageMonthlyRate: number;
  paidVsExpectedDeviationPct: number; // promedio
}

export async function listCounterpartiesWithStats(): Promise<CounterpartyWithStats[]> {
  const supabase = await createClient();

  const { data: rawCps, error } = await supabase
    .from("counterparties")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  const cps = (rawCps ?? []) as unknown as CounterpartyRow[];

  if (cps.length === 0) return [];

  const ids = cps.map((c) => c.id);
  const { data: rawOps } = await supabase
    .from("operations")
    .select(
      "id, counterparty_id, kind, currency, amount, expected_total, expected_return, actual_return, status, start_date",
    )
    .in("counterparty_id", ids);

  type Op = {
    id: string;
    counterparty_id: string;
    kind: string;
    currency: string;
    amount: number;
    expected_total: number | null;
    expected_return: number | null;
    actual_return: number | null;
    status: string;
    start_date: string;
  };
  const ops = (rawOps ?? []) as unknown as Op[];

  const byCp = new Map<string, Op[]>();
  for (const o of ops) {
    const arr = byCp.get(o.counterparty_id) ?? [];
    arr.push(o);
    byCp.set(o.counterparty_id, arr);
  }

  return cps.map((cp) => {
    const items = byCp.get(cp.id) ?? [];
    const totalBought = items
      .filter((o) =>
        ["check_purchase", "fx_buy", "crypto_buy"].includes(o.kind),
      )
      .reduce((s, o) => s + Number(o.amount), 0);
    const totalSold = items
      .filter((o) => ["fx_sell", "crypto_sell"].includes(o.kind))
      .reduce((s, o) => s + Number(o.amount), 0);
    const pending = items
      .filter(
        (o) =>
          o.kind === "check_purchase" &&
          ["active", "near_due", "overdue"].includes(o.status),
      )
      .reduce((s, o) => s + Number(o.expected_total ?? o.amount), 0);
    const defaulted = items
      .filter((o) => o.status === "in_default")
      .reduce((s, o) => s + Number(o.expected_total ?? o.amount), 0);
    const collected = items
      .filter((o) => o.status === "collected")
      .reduce((s, o) => s + Number(o.actual_return ?? o.expected_return ?? 0), 0);
    const closedOps = items.filter(
      (o) => o.actual_return != null && o.expected_return != null,
    );
    const avgRateOps = items.filter((o) => o.expected_return != null && o.amount > 0);
    const averageMonthlyRate =
      avgRateOps.length === 0
        ? 0
        : avgRateOps.reduce((s, o) => {
            const r = Number(o.expected_return) / Number(o.amount);
            return s + r;
          }, 0) / avgRateOps.length;
    const deviation =
      closedOps.length === 0
        ? 0
        : closedOps.reduce(
            (s, o) =>
              s +
              ((Number(o.actual_return ?? 0) -
                Number(o.expected_return ?? 0)) /
                Number(o.expected_return ?? 1)),
            0,
          ) / closedOps.length;
    const lastDate = items
      .map((o) => o.start_date)
      .sort()
      .pop() ?? null;

    return {
      ...cp,
      totalOperations: items.length,
      totalBoughtARS: totalBought,
      totalSoldARS: totalSold,
      pendingARS: pending,
      defaultedARS: defaulted,
      collectedARS: collected,
      lastOperationDate: lastDate,
      averageMonthlyRate,
      paidVsExpectedDeviationPct: deviation,
    };
  });
}

export async function getCounterpartyDetail(id: string) {
  const supabase = await createClient();
  const { data: cpRaw, error } = await supabase
    .from("counterparties")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !cpRaw) return null;
  const cp = cpRaw as unknown as CounterpartyRow;

  const { data: opsRaw } = await supabase
    .from("operations")
    .select(
      "id, kind, counterparty, currency, amount, expected_total, expected_return, actual_return, due_date, start_date, status, monthly_rate, checks(face_value, paid_amount, due_date as check_due_date), fx_trades(side, asset, units, unit_price)",
    )
    .eq("counterparty_id", id)
    .order("start_date", { ascending: false });

  return {
    counterparty: cp,
    operations: (opsRaw ?? []) as unknown as Array<{
      id: string;
      kind: string;
      counterparty: string | null;
      currency: string;
      amount: number;
      expected_total: number | null;
      expected_return: number | null;
      actual_return: number | null;
      due_date: string | null;
      start_date: string;
      status: string;
      monthly_rate: number | null;
      checks: Array<{ face_value: number; paid_amount: number }> | null;
      fx_trades: Array<{
        side: string;
        asset: string;
        units: number;
        unit_price: number;
      }> | null;
    }>,
  };
}

export async function listCounterpartiesBasic(): Promise<
  { id: string; full_name: string; alias: string | null }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counterparties")
    .select("id, full_name, alias")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown) as {
    id: string;
    full_name: string;
    alias: string | null;
  }[];
}
