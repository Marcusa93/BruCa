import { createAdminClient } from "@/lib/supabase/admin";
import { simulateReinvestment } from "@/lib/finance/simulations";
import type { ToolName } from "./tools";

type Args = Record<string, unknown>;

/** Resultado tipado de una tool, serializable como JSON para el modelo. */
export type ToolResult =
  | { ok: true; data: unknown; meta?: Record<string, unknown> }
  | { ok: false; error: string; hint?: string };

const noData = (hint: string): ToolResult => ({
  ok: false,
  error: "no_data",
  hint,
});

function isMissingTable(err: unknown) {
  const msg = (err as { message?: string })?.message ?? String(err);
  return /relation .* does not exist|schema cache/i.test(msg);
}

export async function runTool(name: ToolName, args: Args): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_dashboard_kpis":
        return await getDashboardKpis(args.currency as string);
      case "list_upcoming_maturities":
        return await listUpcomingMaturities(
          Number(args.days),
          (args.currency as string) ?? "ALL",
          Number(args.limit ?? 20),
        );
      case "list_overdue_or_default_placements":
        return await listOverdue(Number(args.limit ?? 20));
      case "top_investors_by_capital":
        return await topInvestors(
          Number(args.limit ?? 10),
          (args.currency as string) ?? "ALL",
        );
      case "capital_by_currency":
        return await capitalByCurrency();
      case "treasury_latest":
        return await treasuryLatest();
      case "deviation_ranking":
        return await deviationRanking(Number(args.limit ?? 10));
      case "simulate_reinvestment":
        return runSimulateReinvestment(args);
      default:
        return { ok: false, error: `Tool desconocida: ${name}` };
    }
  } catch (err) {
    if (isMissingTable(err)) {
      return noData(
        "Las tablas todavía no existen en Supabase. Aplicá la migración 0001_initial_schema.sql primero.",
      );
    }
    return { ok: false, error: (err as Error).message ?? "Error inesperado" };
  }
}

// ===== Implementaciones =====

async function getDashboardKpis(currency: string): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("v_dashboard_kpis").select("*");
  if (error) throw error;
  if (!data || data.length === 0) return noData("No hay inversiones cargadas todavía.");
  const filtered = currency === "ALL" ? data : data.filter((r) => r.currency === currency);
  return { ok: true, data: filtered };
}

async function listUpcomingMaturities(
  days: number,
  currency: string,
  limit: number,
): Promise<ToolResult> {
  const sb = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const limitDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  let q = sb
    .from("operations")
    .select("id, kind, counterparty, currency, amount, due_date, status, monthly_rate, expected_total")
    .gte("due_date", today)
    .lte("due_date", limitDate)
    .not("status", "in", "(collected,reinvested,cancelled)")
    .order("due_date", { ascending: true })
    .limit(limit);

  if (currency !== "ALL") q = q.eq("currency", currency);
  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0)
    return noData(`No hay vencimientos en los próximos ${days} días.`);
  return { ok: true, data, meta: { count: data.length } };
}

async function listOverdue(limit: number): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("operations")
    .select("id, kind, counterparty, currency, amount, due_date, status")
    .in("status", ["overdue", "in_default"])
    .order("due_date", { ascending: true })
    .limit(limit);
  if (error) throw error;
  if (!data || data.length === 0) return noData("No hay operaciones vencidas ni en mora.");
  return { ok: true, data };
}

async function topInvestors(limit: number, currency: string): Promise<ToolResult> {
  const sb = createAdminClient();
  let q = sb
    .from("investments")
    .select("investor_id, currency, amount, investors(full_name)")
    .in("status", ["active", "partially_placed", "fully_placed"]);
  if (currency !== "ALL") q = q.eq("currency", currency);
  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return noData("Sin inversiones activas cargadas.");
  // Agregamos por inversor
  const map = new Map<string, { name: string; currency: string; amount: number }>();
  for (const row of data as unknown as Array<{
    investor_id: string;
    currency: string;
    amount: number;
    investors: { full_name: string } | null;
  }>) {
    const k = `${row.investor_id}-${row.currency}`;
    const existing = map.get(k);
    if (existing) existing.amount += Number(row.amount);
    else map.set(k, { name: row.investors?.full_name ?? "—", currency: row.currency, amount: Number(row.amount) });
  }
  const sorted = [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
  return { ok: true, data: sorted };
}

async function capitalByCurrency(): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data: invs, error: e1 } = await sb
    .from("investments")
    .select("currency, amount, status");
  if (e1) throw e1;
  const { data: ops, error: e2 } = await sb
    .from("operations")
    .select("currency, amount, status");
  if (e2) throw e2;

  type Row = { currency: string; amount: number; status: string };
  const sumBy = (rows: Row[], valid: string[]) => {
    const m: Record<string, number> = {};
    for (const r of rows ?? []) {
      if (!valid.includes(r.status)) continue;
      m[r.currency] = (m[r.currency] ?? 0) + Number(r.amount);
    }
    return m;
  };

  const received = sumBy((invs ?? []) as unknown as Row[], ["active", "partially_placed", "fully_placed"]);
  const placed = sumBy((ops ?? []) as unknown as Row[], ["active", "near_due", "overdue", "in_default"]);

  if (Object.keys(received).length === 0 && Object.keys(placed).length === 0)
    return noData("Sin inversiones ni colocaciones cargadas.");

  return { ok: true, data: { received, placed } };
}

async function treasuryLatest(): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("v_treasury_latest").select("*");
  if (error) throw error;
  if (!data || data.length === 0) return noData("No hay arqueos de caja cargados.");
  return { ok: true, data };
}

async function deviationRanking(limit: number): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("operations")
    .select("id, counterparty, currency, expected_return, actual_return")
    .not("actual_return", "is", null)
    .not("expected_return", "is", null)
    .limit(200);
  if (error) throw error;
  if (!data || data.length === 0) return noData("No hay operaciones cerradas para comparar.");
  const enriched = data
    .map((r) => ({
      ...r,
      deviation: Number(r.actual_return ?? 0) - Number(r.expected_return ?? 0),
    }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, limit);
  return { ok: true, data: enriched };
}

function runSimulateReinvestment(args: Args): ToolResult {
  const capital = Number(args.capital);
  const monthlyRate = Number(args.monthly_rate);
  const months = Number(args.months);
  const reinvest = args.reinvest_interest !== false;
  const currency = (args.currency as string) ?? "ARS";

  const series = simulateReinvestment(capital, monthlyRate, months, {
    reinvestInterest: reinvest,
  });
  const final = series[series.length - 1];
  const totalInterest = series.reduce((s, x) => s + x.interest, 0);

  return {
    ok: true,
    data: {
      currency,
      input: { capital, monthly_rate: monthlyRate, months, reinvest_interest: reinvest },
      summary: {
        final_capital: final?.endingCapital ?? capital,
        total_interest: totalInterest,
        effective_rate: capital > 0 ? totalInterest / capital : 0,
      },
      monthly: series,
    },
    meta: { note: "Proyección lineal: rendimiento = capital × tasa × días / 30" },
  };
}
