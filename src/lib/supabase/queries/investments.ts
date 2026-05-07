import { createClient } from "@/lib/supabase/server";

export interface InvestmentListRow {
  id: string;
  investor_id: string;
  investor_name: string;
  currency: "ARS" | "USD" | "EUR" | "BRL";
  amount: number;
  entry_date: string;
  estimated_term_days: number | null;
  monthly_rate: number;
  committed_return_amount: number | null;
  committed_return_date: string | null;
  status: string;
  notes: string | null;
}

export async function listInvestments(): Promise<InvestmentListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .select(
      "id, investor_id, currency, amount, entry_date, estimated_term_days, monthly_rate, committed_return_amount, committed_return_date, status, notes, investors(full_name)",
    )
    .order("entry_date", { ascending: false });
  if (error) throw error;
  type Row = Omit<InvestmentListRow, "investor_name"> & {
    investors: { full_name: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    investor_name: r.investors?.full_name ?? "—",
  }));
}

export async function listInvestorsBasic(): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investors")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return ((data ?? []) as unknown) as { id: string; full_name: string }[];
}
