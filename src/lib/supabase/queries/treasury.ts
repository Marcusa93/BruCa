import { createClient } from "@/lib/supabase/server";

export interface DenominationRow {
  id: string;
  currency: "ARS" | "USD" | "EUR" | "BRL";
  value: number;
  is_active: boolean;
}

export async function listDenominations(): Promise<DenominationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("denominations")
    .select("id, currency, value, is_active")
    .eq("is_active", true)
    .order("currency", { ascending: true })
    .order("value", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as DenominationRow[]).map((d) => ({
    ...d,
    value: Number(d.value),
  }));
}

export interface CashCountSummary {
  id: string;
  count_date: string;
  notes: string | null;
  created_at: string;
}

export async function getLatestCashCount() {
  const supabase = await createClient();
  const { data: counts } = await supabase
    .from("cash_counts")
    .select("id, count_date, notes, created_at")
    .order("count_date", { ascending: false })
    .limit(1);
  if (!counts || counts.length === 0) return null;
  const latest = (counts[0] as unknown) as CashCountSummary;

  const { data: lines } = await supabase
    .from("cash_count_lines")
    .select(
      "id, denomination_id, bundles, loose, bundle_size, total_units, denominations(currency, value)",
    )
    .eq("cash_count_id", latest.id);

  type LineRow = {
    id: string;
    denomination_id: string;
    bundles: number;
    loose: number;
    bundle_size: number;
    total_units: number;
    denominations: { currency: string; value: number } | null;
  };

  const enriched = ((lines ?? []) as unknown as LineRow[]).map((l) => ({
    ...l,
    currency: l.denominations?.currency ?? "ARS",
    value: Number(l.denominations?.value ?? 0),
    line_total: Number(l.denominations?.value ?? 0) * Number(l.total_units ?? 0),
  }));

  const totals: Record<string, number> = {};
  for (const l of enriched) {
    totals[l.currency] = (totals[l.currency] ?? 0) + l.line_total;
  }

  return {
    cashCount: latest,
    lines: enriched,
    totals,
  };
}

export async function listCashCounts(limit = 20): Promise<CashCountSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_counts")
    .select("id, count_date, notes, created_at")
    .order("count_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown) as CashCountSummary[];
}

/**
 * Saldo teórico = sumar todos los movimientos de operaciones cerradas/abiertas.
 * Egresos restan, ingresos suman, en la moneda del egreso/ingreso.
 * (Para v1 — usa el monto bruto de operaciones, no payments).
 */
export async function getTheoreticalBalance(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data: ops } = await supabase
    .from("operations")
    .select("kind, currency, amount, status");

  type Row = { kind: string; currency: string; amount: number; status: string };
  const balance: Record<string, number> = {};
  for (const o of ((ops ?? []) as unknown as Row[])) {
    if (o.status === "cancelled") continue;
    const amt = Number(o.amount);
    let direction: 1 | -1 | 0 = 0;
    if (
      o.kind === "fx_buy" ||
      o.kind === "crypto_buy" ||
      o.kind === "check_purchase"
    ) {
      direction = -1; // egreso
    } else if (o.kind === "fx_sell" || o.kind === "crypto_sell") {
      direction = +1; // ingreso
    }
    if (direction !== 0) {
      balance[o.currency] = (balance[o.currency] ?? 0) + direction * amt;
    }
  }
  // Sumar inversiones recibidas (ingreso)
  const { data: invs } = await supabase
    .from("investments")
    .select("currency, amount, status");
  for (const i of ((invs ?? []) as unknown as { currency: string; amount: number; status: string }[])) {
    if (["cancelled", "returned"].includes(i.status)) continue;
    balance[i.currency] = (balance[i.currency] ?? 0) + Number(i.amount);
  }
  return balance;
}
