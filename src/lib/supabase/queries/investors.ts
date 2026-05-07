import { createClient } from "@/lib/supabase/server";

export interface InvestorRow {
  id: string;
  full_name: string;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InvestorWithStats extends InvestorRow {
  totalCapitalARS: number;
  totalCapitalUSD: number;
  weightedRate: number;
  activeInvestments: number;
}

export async function listInvestorsWithStats(): Promise<InvestorWithStats[]> {
  const supabase = await createClient();
  const { data: investors, error: e1 } = await supabase
    .from("investors")
    .select("id, full_name, document_number, email, phone, is_active, created_at")
    .order("created_at", { ascending: false });
  if (e1) throw e1;
  const { data: investments } = await supabase
    .from("investments")
    .select("investor_id, currency, amount, monthly_rate, status");

  type Inv = {
    investor_id: string;
    currency: string;
    amount: number;
    monthly_rate: number;
    status: string;
  };
  const invsByInvestor = new Map<string, Inv[]>();
  for (const i of (investments ?? []) as unknown as Inv[]) {
    const arr = invsByInvestor.get(i.investor_id) ?? [];
    arr.push(i);
    invsByInvestor.set(i.investor_id, arr);
  }

  return ((investors ?? []) as unknown as InvestorRow[]).map((inv) => {
    const items = invsByInvestor.get(inv.id) ?? [];
    const active = items.filter((i) =>
      ["active", "partially_placed", "fully_placed"].includes(i.status),
    );
    const ars = active
      .filter((i) => i.currency === "ARS")
      .reduce((s, i) => s + Number(i.amount), 0);
    const usd = active
      .filter((i) => i.currency === "USD")
      .reduce((s, i) => s + Number(i.amount), 0);
    const totalAll = active.reduce((s, i) => s + Number(i.amount), 0);
    const weightedRate =
      totalAll === 0
        ? 0
        : active.reduce((s, i) => s + Number(i.amount) * Number(i.monthly_rate), 0) /
          totalAll;
    return {
      ...inv,
      totalCapitalARS: ars,
      totalCapitalUSD: usd,
      weightedRate,
      activeInvestments: active.length,
    };
  });
}

export interface InvestorFull {
  id: string;
  full_name: string;
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export async function getInvestorDetail(id: string) {
  const supabase = await createClient();
  const { data: investorRaw, error } = await supabase
    .from("investors")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  const investor = investorRaw as unknown as InvestorFull;

  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("investor_id", id)
    .order("entry_date", { ascending: false });

  // Operaciones financiadas por este inversor (vía investment_operations)
  const investmentIds = (investments ?? []).map((i) => i.id);
  const { data: links } =
    investmentIds.length > 0
      ? await supabase
          .from("investment_operations")
          .select("investment_id, operation_id, allocated_amount")
          .in("investment_id", investmentIds)
      : { data: [] };

  const operationIds = (links ?? []).map((l) => l.operation_id);
  const { data: operations } =
    operationIds.length > 0
      ? await supabase
          .from("operations")
          .select(
            "id, kind, counterparty, currency, amount, start_date, due_date, status, expected_total",
          )
          .in("id", operationIds)
      : { data: [] };

  return {
    investor,
    investments: investments ?? [],
    links: links ?? [],
    operations: operations ?? [],
  };
}
