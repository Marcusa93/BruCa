import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OperationRow {
  id: string;
  counterparty: string | null;
  currency: string;
  amount: number;
  expected_total: number | null;
  due_date: string;
  status: string;
}

interface InvestmentRow {
  id: string;
  investor_id: string;
  currency: string;
  committed_return_amount: number | null;
  committed_return_date: string;
  status: string;
  investors: { full_name: string } | null;
}

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

function dateOffset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron envía Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createAdminClient();
  const today = dateOffset(0);
  const tomorrow = dateOffset(1);
  const yesterday = dateOffset(-1);
  const twoDaysAgo = dateOffset(-2);
  const inThreeDays = dateOffset(3);

  const summary = {
    maturity_tomorrow: 0,
    maturity_today_unmarked: 0,
    commitment_due_soon: 0,
    possible_default: 0,
    pushes_sent: 0,
    pushes_failed: 0,
    pushes_removed: 0,
  };

  // 1) Vencimientos para mañana
  const { data: tomorrowRaw } = await sb
    .from("operations")
    .select(
      "id, counterparty, currency, amount, expected_total, due_date, status",
    )
    .eq("due_date", tomorrow)
    .not("status", "in", "(collected,reinvested,cancelled)");
  const tomorrowOps = (tomorrowRaw ?? []) as unknown as OperationRow[];
  for (const op of tomorrowOps) {
    const total = Number(op.expected_total ?? op.amount);
    const result = await sendPushToAll({
      kind: "maturity_tomorrow",
      title: `Mañana cobramos: ${op.counterparty ?? "—"}`,
      body: `${fmtARS(total)} vence ${tomorrow}`,
      url: `/colocaciones/${op.id}`,
      tag: `maturity-${op.id}`,
    });
    summary.maturity_tomorrow++;
    summary.pushes_sent += result.sent;
    summary.pushes_failed += result.failed;
    summary.pushes_removed += result.removed;
  }

  // 2) Vencen hoy y siguen como "active"
  const { data: todayRaw } = await sb
    .from("operations")
    .select(
      "id, counterparty, currency, amount, expected_total, due_date, status",
    )
    .eq("due_date", today)
    .eq("status", "active");
  const todayOps = (todayRaw ?? []) as unknown as OperationRow[];
  for (const op of todayOps) {
    const total = Number(op.expected_total ?? op.amount);
    const result = await sendPushToAll({
      kind: "maturity_today_unmarked",
      title: `⚠ Vence hoy y sigue activa: ${op.counterparty ?? "—"}`,
      body: `${fmtARS(total)} — marcala como cobrada o en mora`,
      url: `/vencimientos`,
      tag: `today-${op.id}`,
      requireInteraction: true,
    });
    summary.maturity_today_unmarked++;
    summary.pushes_sent += result.sent;
    summary.pushes_failed += result.failed;
    summary.pushes_removed += result.removed;
  }

  // 3) Posible mora: vencidas hace 1-2 días sin marcar
  const { data: laggedRaw } = await sb
    .from("operations")
    .select(
      "id, counterparty, currency, amount, expected_total, due_date, status",
    )
    .gte("due_date", twoDaysAgo)
    .lte("due_date", yesterday)
    .in("status", ["active", "near_due", "overdue"]);
  const laggedOps = (laggedRaw ?? []) as unknown as OperationRow[];
  for (const op of laggedOps) {
    const total = Number(op.expected_total ?? op.amount);
    const days = Math.round(
      (Date.parse(today) - Date.parse(op.due_date)) / 86400000,
    );
    const result = await sendPushToAll({
      kind: "possible_default",
      title: `Posible mora: ${op.counterparty ?? "—"}`,
      body: `Lleva ${days} día${days === 1 ? "" : "s"} sin cobrar (${fmtARS(total)})`,
      url: `/colocaciones/${op.id}`,
      tag: `default-${op.id}`,
    });
    summary.possible_default++;
    summary.pushes_sent += result.sent;
    summary.pushes_failed += result.failed;
    summary.pushes_removed += result.removed;
  }

  // 4) Compromisos a inversores en los próximos 3 días
  const { data: commitsRaw } = await sb
    .from("investments")
    .select(
      "id, investor_id, currency, committed_return_amount, committed_return_date, status, investors(full_name)",
    )
    .in("status", ["active", "partially_placed", "fully_placed"])
    .lte("committed_return_date", inThreeDays)
    .gte("committed_return_date", today);
  const commits = (commitsRaw ?? []) as unknown as InvestmentRow[];
  for (const c of commits) {
    if (!c.committed_return_amount) continue;
    const result = await sendPushToAll({
      kind: "commitment_due_soon",
      title: `Compromiso ${c.investors?.full_name ?? ""}`,
      body: `Devolución ${c.committed_return_date} · ${fmtARS(Number(c.committed_return_amount))}`,
      url: `/inversores/${c.investor_id}`,
      tag: `commitment-${c.id}`,
    });
    summary.commitment_due_soon++;
    summary.pushes_sent += result.sent;
    summary.pushes_failed += result.failed;
    summary.pushes_removed += result.removed;
  }

  return NextResponse.json({ ok: true, summary });
}
