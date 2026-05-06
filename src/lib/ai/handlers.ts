import { createAdminClient } from "@/lib/supabase/admin";
import { simulateReinvestment } from "@/lib/finance/simulations";
import type { ToolName } from "./tools";

type Args = Record<string, unknown>;

export type ToolResult =
  | { ok: true; data: unknown; meta?: Record<string, unknown> }
  | { ok: false; error: string; hint?: string };

const noData = (hint: string): ToolResult => ({ ok: false, error: "no_data", hint });
const todayISO = () => new Date().toISOString().slice(0, 10);

function isMissingTable(err: unknown) {
  const msg = (err as { message?: string })?.message ?? String(err);
  return /relation .* does not exist|schema cache/i.test(msg);
}

export async function runTool(name: ToolName, args: Args): Promise<ToolResult> {
  try {
    switch (name) {
      // ===== LECTURA =====
      case "get_dashboard_kpis":
        return await getDashboardKpis(String(args.currency ?? "ALL"));
      case "list_upcoming_maturities":
        return await listUpcomingMaturities(
          Number(args.days),
          String(args.currency ?? "ALL"),
          Number(args.limit ?? 20),
        );
      case "list_overdue_or_default_placements":
        return await listOverdue(Number(args.limit ?? 20));
      case "top_investors_by_capital":
        return await topInvestors(Number(args.limit ?? 10), String(args.currency ?? "ALL"));
      case "capital_by_currency":
        return await capitalByCurrency();
      case "treasury_latest":
        return await treasuryLatest();
      case "deviation_ranking":
        return await deviationRanking(Number(args.limit ?? 10));
      case "search_operation":
        return await searchOperation(args);
      case "find_investor":
        return await findInvestor(String(args.name ?? ""));
      case "simulate_reinvestment":
        return runSimulateReinvestment(args);

      // ===== ESCRITURA =====
      case "create_investor":
        return await createInvestor(args);
      case "create_investment":
        return await createInvestment(args);
      case "create_check_purchase":
        return await createCheckPurchase(args);
      case "create_fx_trade":
        return await createFxTrade(args);
      case "create_crypto_trade":
        return await createCryptoTrade(args);
      case "register_payment":
        return await registerPayment(args);
      case "set_operation_status":
        return await setOperationStatus(args);

      default:
        return { ok: false, error: `Acción desconocida: ${name}` };
    }
  } catch (err) {
    if (isMissingTable(err)) {
      return noData("La base todavía no está inicializada.");
    }
    return { ok: false, error: (err as Error).message ?? "Error inesperado" };
  }
}

// ============ LECTURA ============

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
  const today = todayISO();
  const limitDate = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  let q = sb
    .from("operations")
    .select(
      "id, kind, counterparty, currency, amount, due_date, status, monthly_rate, expected_total, expected_return",
    )
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
  type Row = { investor_id: string; currency: string; amount: number; investors: { full_name: string } | null };
  const map = new Map<string, { name: string; currency: string; amount: number }>();
  for (const row of data as unknown as Row[]) {
    const k = `${row.investor_id}-${row.currency}`;
    const prev = map.get(k);
    if (prev) prev.amount += Number(row.amount);
    else
      map.set(k, {
        name: row.investors?.full_name ?? "—",
        currency: row.currency,
        amount: Number(row.amount),
      });
  }
  const sorted = [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
  return { ok: true, data: sorted };
}

async function capitalByCurrency(): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data: invs, error: e1 } = await sb.from("investments").select("currency, amount, status");
  if (e1) throw e1;
  const { data: ops, error: e2 } = await sb.from("operations").select("currency, amount, status, kind");
  if (e2) throw e2;
  type R = { currency: string; amount: number; status: string };
  const sumBy = (rows: R[], valid: string[]) => {
    const m: Record<string, number> = {};
    for (const r of rows ?? []) {
      if (!valid.includes(r.status)) continue;
      m[r.currency] = (m[r.currency] ?? 0) + Number(r.amount);
    }
    return m;
  };
  const received = sumBy((invs ?? []) as unknown as R[], [
    "active",
    "partially_placed",
    "fully_placed",
  ]);
  type OR = R & { kind: string };
  const opsTyped = (ops ?? []) as unknown as OR[];
  const placedChecks = sumBy(
    opsTyped.filter((o) => o.kind === "check_purchase"),
    ["active", "near_due", "overdue", "in_default"],
  );
  if (Object.keys(received).length === 0 && Object.keys(placedChecks).length === 0)
    return noData("Sin inversiones ni colocaciones cargadas.");
  return { ok: true, data: { received, placed_in_checks: placedChecks } };
}

async function treasuryLatest(): Promise<ToolResult> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("v_treasury_latest").select("*");
  if (error) throw error;
  if (!data || data.length === 0) return noData("No hay arqueos cargados.");
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

async function searchOperation(args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  let q = sb
    .from("operations")
    .select("id, kind, counterparty, currency, amount, due_date, status, expected_total")
    .order("start_date", { ascending: false })
    .limit(Number(args.limit ?? 10));
  if (args.counterparty_contains)
    q = q.ilike("counterparty", `%${String(args.counterparty_contains)}%`);
  if (args.kind) q = q.eq("kind", String(args.kind));
  if (args.min_amount != null) q = q.gte("amount", Number(args.min_amount));
  if (args.max_amount != null) q = q.lte("amount", Number(args.max_amount));
  const { data, error } = await q;
  if (error) throw error;
  if (!data || data.length === 0) return noData("No se encontraron operaciones que coincidan.");
  return { ok: true, data };
}

async function findInvestor(name: string): Promise<ToolResult> {
  if (!name.trim()) return { ok: false, error: "Nombre vacío" };
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("investors")
    .select("id, full_name, is_active")
    .ilike("full_name", `%${name.trim()}%`)
    .limit(5);
  if (error) throw error;
  if (!data || data.length === 0) return noData(`No hay inversores que coincidan con "${name}".`);
  return { ok: true, data };
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
    meta: { note: "Proyección lineal" },
  };
}

// ============ ESCRITURA ============

async function createInvestor(args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  const payload = {
    full_name: String(args.full_name).trim(),
    document_number: args.document_number ? String(args.document_number) : null,
    email: args.email ? String(args.email) : null,
    phone: args.phone ? String(args.phone) : null,
    notes: args.notes ? String(args.notes) : null,
  };
  if (!payload.full_name) return { ok: false, error: "Falta el nombre del inversor." };
  const { data, error } = await sb.from("investors").insert(payload).select().single();
  if (error) throw error;
  return { ok: true, data };
}

async function resolveInvestorId(args: Args): Promise<string | null> {
  if (args.investor_id) return String(args.investor_id);
  const name = args.investor_name ? String(args.investor_name).trim() : "";
  if (!name) return null;
  const sb = createAdminClient();
  const { data: existing } = await sb
    .from("investors")
    .select("id, full_name")
    .ilike("full_name", name)
    .limit(1);
  if (existing && existing.length > 0) return String(existing[0].id);
  // Crear si no existe
  const { data, error } = await sb
    .from("investors")
    .insert({ full_name: name })
    .select("id")
    .single();
  if (error) throw error;
  return String(data.id);
}

async function createInvestment(args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  const investor_id = await resolveInvestorId(args);
  const currency = String(args.currency).toUpperCase();
  const amount = Number(args.amount);
  if (!investor_id) return { ok: false, error: "Falta inversor (investor_id o investor_name)." };
  if (!currency || !amount) return { ok: false, error: "Faltan moneda o monto." };

  const entry_date = args.entry_date ? String(args.entry_date) : todayISO();
  const term_days = args.term_days ? Number(args.term_days) : 30;
  const monthly_rate = args.monthly_rate != null ? Number(args.monthly_rate) : 0.04;

  // Calcular committed_return si no fue dado
  const committed_return_amount = args.committed_return_amount
    ? Number(args.committed_return_amount)
    : amount + amount * monthly_rate * (term_days / 30);

  // Fecha de devolución
  const dueDate = new Date(entry_date);
  dueDate.setDate(dueDate.getDate() + term_days);
  const committed_return_date = dueDate.toISOString().slice(0, 10);

  const payload = {
    investor_id,
    currency,
    amount,
    entry_date,
    estimated_term_days: term_days,
    monthly_rate,
    committed_return_amount,
    committed_return_date,
    status: "active" as const,
    notes: args.notes ? String(args.notes) : null,
  };
  const { data, error } = await sb.from("investments").insert(payload).select().single();
  if (error) throw error;
  return { ok: true, data };
}

async function createCheckPurchase(args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  const counterparty = String(args.counterparty);
  const paid = Number(args.paid_amount);
  const face = Number(args.face_value);
  if (!counterparty || paid <= 0 || face <= 0)
    return { ok: false, error: "Falta contraparte, monto pagado o valor nominal." };
  const start_date = args.start_date ? String(args.start_date) : todayISO();
  const due_date = String(args.due_date);
  if (!due_date) return { ok: false, error: "Falta fecha de vencimiento." };
  const currency = (args.currency as string) ?? "ARS";

  // Cálculo de tasa implícita
  const days = Math.max(
    1,
    (Date.parse(due_date) - Date.parse(start_date)) / (1000 * 60 * 60 * 24),
  );
  const expected_return = face - paid;
  const monthly_rate = (expected_return / paid) * (30 / days);

  const opPayload = {
    kind: "check_purchase",
    counterparty,
    currency,
    amount: paid,
    start_date,
    due_date,
    monthly_rate: Number(monthly_rate.toFixed(6)),
    expected_return,
    expected_total: face,
    status: "active" as const,
    notes: args.notes ? String(args.notes) : null,
  };
  const { data: op, error } = await sb.from("operations").insert(opPayload).select().single();
  if (error) throw error;

  await sb.from("checks").insert({
    operation_id: op.id,
    drawer: counterparty,
    paid_amount: paid,
    face_value: face,
    due_date,
  });

  // Vincular a inversor si pidió
  if (args.attribute_to_investor) {
    const investorId = await resolveInvestorId({ investor_name: args.attribute_to_investor });
    if (investorId) {
      const { data: inv } = await sb
        .from("investments")
        .select("id")
        .eq("investor_id", investorId)
        .order("entry_date", { ascending: false })
        .limit(1);
      if (inv && inv.length > 0) {
        await sb.from("investment_operations").insert({
          investment_id: inv[0].id,
          operation_id: op.id,
          allocated_amount: paid,
        });
      }
    }
  }

  return { ok: true, data: op };
}

async function createTrade(kind: "fx" | "crypto", args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  const side = String(args.side);
  const asset = String(args.asset).toUpperCase();
  const units = Number(args.units);
  const unit_price = Number(args.unit_price);
  if (!["buy", "sell"].includes(side) || !asset || units <= 0 || unit_price <= 0)
    return { ok: false, error: "Datos incompletos para la operación." };
  const date = args.date ? String(args.date) : todayISO();
  const counterparty = args.counterparty ? String(args.counterparty) : null;
  const amountARS = units * unit_price;

  const opKind =
    kind === "fx"
      ? side === "buy"
        ? "fx_buy"
        : "fx_sell"
      : side === "buy"
        ? "crypto_buy"
        : "crypto_sell";

  const opPayload = {
    kind: opKind,
    counterparty,
    currency: "ARS",
    amount: amountARS,
    start_date: date,
    status: "collected" as const,
    notes: args.notes ? String(args.notes) : null,
  };
  const { data: op, error } = await sb.from("operations").insert(opPayload).select().single();
  if (error) throw error;

  await sb.from("fx_trades").insert({
    operation_id: op.id,
    side,
    asset,
    quote_currency: "ARS",
    unit_price,
    units,
  });

  // Vincular a inversor si pidió y es buy
  if (side === "buy" && args.attribute_to_investor) {
    const investorId = await resolveInvestorId({ investor_name: args.attribute_to_investor });
    if (investorId) {
      const { data: inv } = await sb
        .from("investments")
        .select("id")
        .eq("investor_id", investorId)
        .order("entry_date", { ascending: false })
        .limit(1);
      if (inv && inv.length > 0) {
        await sb.from("investment_operations").insert({
          investment_id: inv[0].id,
          operation_id: op.id,
          allocated_amount: amountARS,
        });
      }
    }
  }

  return { ok: true, data: op };
}

const createFxTrade = (args: Args) => createTrade("fx", args);
const createCryptoTrade = (args: Args) => createTrade("crypto", args);

async function registerPayment(args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  const payload = {
    operation_id: args.operation_id ? String(args.operation_id) : null,
    investment_id: args.investment_id ? String(args.investment_id) : null,
    direction: String(args.direction),
    concept: String(args.concept),
    amount: Number(args.amount),
    currency: String(args.currency).toUpperCase(),
    payment_date: String(args.payment_date),
    notes: args.notes ? String(args.notes) : null,
  };
  if (!payload.operation_id && !payload.investment_id)
    return { ok: false, error: "Necesito operation_id o investment_id." };
  const { data, error } = await sb.from("payments").insert(payload).select().single();
  if (error) throw error;
  return { ok: true, data };
}

async function setOperationStatus(args: Args): Promise<ToolResult> {
  const sb = createAdminClient();
  const operation_id = String(args.operation_id);
  const new_status = String(args.new_status);
  const update: Record<string, unknown> = { status: new_status };
  if (args.actual_return != null) {
    update.actual_return = Number(args.actual_return);
    update.actual_total = Number(args.actual_return); // se podría refinar
  }
  if (args.notes) update.notes = String(args.notes);
  const { data, error } = await sb
    .from("operations")
    .update(update)
    .eq("id", operation_id)
    .select()
    .single();
  if (error) throw error;
  return { ok: true, data };
}
