import { createClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/finance/formatters";
import type { PlacementStatus } from "@/lib/finance/status";

export interface DashboardKpis {
  capitalReceived: Record<Currency, number>;
  capitalCommitted: Record<Currency, number>;
  capitalPlacedActive: Record<Currency, number>;
  treasury: Record<Currency, number>;
  expectedMonthlyReturn: number;
  weightedRate: number;
}

export interface MaturityRow {
  id: string;
  counterparty: string;
  type: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  status: PlacementStatus;
}

export interface CommitmentRow {
  investor: string;
  investorId: string;
  date: string;
  amount: number;
  currency: Currency;
}

const KIND_LABEL: Record<string, string> = {
  check_purchase: "Cheque",
  fx_buy: "Compra USD",
  fx_sell: "Venta USD",
  crypto_buy: "Compra USDT",
  crypto_sell: "Venta USDT",
  other: "Otro",
};

export async function getDashboardData() {
  const sb = await createClient();

  const [kpisRes, treasuryRes, opsRes, invRes] = await Promise.all([
    sb.from("v_dashboard_kpis").select("*"),
    sb.from("v_treasury_latest").select("*"),
    sb
      .from("operations")
      .select("id, kind, counterparty, currency, amount, due_date, status, expected_return, expected_total, monthly_rate")
      .order("due_date", { ascending: true, nullsFirst: false }),
    sb
      .from("investments")
      .select("id, investor_id, currency, amount, monthly_rate, committed_return_amount, committed_return_date, status, investors(full_name)")
      .order("committed_return_date", { ascending: true, nullsFirst: false }),
  ]);

  type KpiRow = { currency: Currency; capital_received: number; committed_return: number };
  type TreasuryRow = { currency: Currency; total_amount: number };
  type OpRow = {
    id: string;
    kind: string;
    counterparty: string | null;
    currency: Currency;
    amount: number;
    due_date: string | null;
    status: PlacementStatus;
    expected_return: number | null;
    expected_total: number | null;
    monthly_rate: number | null;
  };
  type InvRow = {
    id: string;
    investor_id: string;
    currency: Currency;
    amount: number;
    monthly_rate: number;
    committed_return_amount: number | null;
    committed_return_date: string | null;
    status: string;
    investors: { full_name: string } | null;
  };

  const kpiRows = ((kpisRes.data ?? []) as unknown as KpiRow[]);
  const treasuryRows = ((treasuryRes.data ?? []) as unknown as TreasuryRow[]);
  const ops = ((opsRes.data ?? []) as unknown as OpRow[]);
  const invs = ((invRes.data ?? []) as unknown as InvRow[]);

  // KPIs
  const empty: Record<Currency, number> = { ARS: 0, USD: 0, EUR: 0, BRL: 0 };
  const capitalReceived = { ...empty };
  const capitalCommitted = { ...empty };
  for (const r of kpiRows) {
    capitalReceived[r.currency] = Number(r.capital_received ?? 0);
    capitalCommitted[r.currency] = Number(r.committed_return ?? 0);
  }

  const capitalPlacedActive = { ...empty };
  const ACTIVE_STATUSES = new Set(["active", "near_due", "overdue", "in_default"]);
  for (const op of ops) {
    if (op.kind === "check_purchase" && ACTIVE_STATUSES.has(op.status)) {
      capitalPlacedActive[op.currency] = (capitalPlacedActive[op.currency] ?? 0) + Number(op.amount);
    }
  }

  const treasury = { ...empty };
  for (const r of treasuryRows) {
    treasury[r.currency] = Number(r.total_amount ?? 0);
  }

  const totalReceived = invs
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount), 0);
  const weightedRate =
    totalReceived === 0
      ? 0
      : invs.reduce((s, i) => s + Number(i.amount) * Number(i.monthly_rate), 0) / totalReceived;

  // Rendimiento esperado del mes a inversores activos
  const expectedMonthlyReturn = invs
    .filter((i) => ["active", "partially_placed", "fully_placed"].includes(i.status))
    .reduce((s, i) => {
      const ret = i.committed_return_amount ? i.committed_return_amount - Number(i.amount) : 0;
      return s + Number(ret);
    }, 0);

  // Próximos vencimientos (operaciones activas con due_date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturities: MaturityRow[] = ops
    .filter((o) => o.due_date && !["collected", "reinvested", "cancelled"].includes(o.status))
    .map((o) => ({
      id: o.id,
      counterparty: o.counterparty ?? "—",
      type: KIND_LABEL[o.kind] ?? o.kind,
      amount: o.kind === "check_purchase" ? Number(o.expected_total ?? o.amount) : Number(o.amount),
      currency: o.currency,
      dueDate: o.due_date as string,
      status: o.status,
    }))
    .slice(0, 8);

  // Compromisos a inversores
  const commitments: CommitmentRow[] = invs
    .filter((i) => i.committed_return_date && i.committed_return_amount)
    .map((i) => ({
      investor: i.investors?.full_name ?? "—",
      investorId: i.investor_id,
      date: i.committed_return_date as string,
      amount: Number(i.committed_return_amount),
      currency: i.currency,
    }));

  // Asignación de capital ARS
  const checksTotal = ops
    .filter((o) => o.kind === "check_purchase" && ACTIVE_STATUSES.has(o.status) && o.currency === "ARS")
    .reduce((s, o) => s + Number(o.amount), 0);
  const cryptoNet = ops
    .filter((o) => o.kind === "crypto_buy" && o.currency === "ARS")
    .reduce((s, o) => s + Number(o.amount), 0)
    - ops
      .filter((o) => o.kind === "crypto_sell" && o.currency === "ARS")
      .reduce((s, o) => s + Number(o.amount), 0);
  const fxNet = ops
    .filter((o) => o.kind === "fx_buy" && o.currency === "ARS")
    .reduce((s, o) => s + Number(o.amount), 0)
    - ops
      .filter((o) => o.kind === "fx_sell" && o.currency === "ARS")
      .reduce((s, o) => s + Number(o.amount), 0);
  const allocation = {
    cheques: checksTotal,
    cryptoNet: Math.max(0, cryptoNet),
    fxNet: Math.max(0, fxNet),
    cash: treasury.ARS ?? 0,
  };

  // Alertas básicas
  const alerts: Array<{ level: "danger" | "warning" | "info"; title: string; detail: string }> = [];
  const overdue = ops.filter((o) => o.status === "overdue" || o.status === "in_default");
  if (overdue.length > 0) {
    alerts.push({
      level: "danger",
      title: `${overdue.length} colocación${overdue.length > 1 ? "es" : ""} vencida${overdue.length > 1 ? "s" : ""}`,
      detail: overdue.map((o) => o.counterparty).filter(Boolean).slice(0, 3).join(" · "),
    });
  }
  const upcoming = ops.filter((o) => {
    if (!o.due_date || ["collected", "reinvested", "cancelled"].includes(o.status)) return false;
    const days = (Date.parse(o.due_date) - today.getTime()) / 86400000;
    return days >= 0 && days <= 7;
  });
  if (upcoming.length > 0) {
    const sum = upcoming.reduce(
      (s, o) => s + Number(o.expected_total ?? o.amount),
      0,
    );
    alerts.push({
      level: "warning",
      title: `${upcoming.length} vencimiento${upcoming.length > 1 ? "s" : ""} esta semana`,
      detail: `Suman $${sum.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
    });
  }
  for (const c of commitments) {
    const days = (Date.parse(c.date) - today.getTime()) / 86400000;
    if (days >= 0 && days <= 30) {
      alerts.push({
        level: "info",
        title: `Compromiso ${c.investor}`,
        detail: `Devolución ${new Date(c.date).toLocaleDateString("es-AR")} · $${c.amount.toLocaleString("es-AR")}`,
      });
    }
  }

  return {
    kpis: {
      capitalReceived,
      capitalCommitted,
      capitalPlacedActive,
      treasury,
      expectedMonthlyReturn,
      weightedRate,
    } as DashboardKpis,
    allocation,
    maturities,
    commitments,
    alerts,
  };
}
