"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendPushToAll } from "@/lib/push/server";

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

async function notifySafe(payload: Parameters<typeof sendPushToAll>[0]) {
  try {
    await sendPushToAll(payload);
  } catch (e) {
    console.warn("[push] no pude enviar:", (e as Error).message);
  }
}

/**
 * Resuelve el counterparty_id a partir de:
 * - un id explícito (string uuid)
 * - un nombre de contraparte (busca por full_name case-insensitive; crea si no existe)
 */
async function resolveCounterpartyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opts: { id?: string | null; name?: string | null },
): Promise<string | null> {
  if (opts.id) return opts.id;
  const name = (opts.name ?? "").trim();
  if (!name) return null;
  const { data: existing } = await supabase
    .from("counterparties")
    .select("id")
    .ilike("full_name", name)
    .limit(1);
  if (existing && existing.length > 0) {
    return (existing[0] as { id: string }).id;
  }
  const { data: created, error } = await supabase
    .from("counterparties")
    .insert({ full_name: name })
    .select("id")
    .single();
  if (error) return null;
  return (created as { id: string }).id;
}

// =================================================================
// Cheque
// =================================================================
const checkSchema = z.object({
  counterparty: z.string().min(1, "Contraparte requerida"),
  counterparty_id: z.string().uuid().nullable().optional(),
  paid_amount: z.number().positive("Monto pagado > 0"),
  face_value: z.number().positive("VN > 0"),
  start_date: z.string().min(1),
  due_date: z.string().min(1, "Vencimiento requerido"),
  currency: z.enum(["ARS", "USD"]),
  notes: z.string().nullable().optional(),
  attribute_to_investment_id: z.string().uuid().nullable().optional(),
  bank: z.string().nullable().optional(),
  check_number: z.string().nullable().optional(),
});

export async function createCheckAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = checkSchema.safeParse({
    counterparty: raw.counterparty,
    counterparty_id:
      raw.counterparty_id && raw.counterparty_id !== ""
        ? String(raw.counterparty_id)
        : null,
    paid_amount: Number(raw.paid_amount),
    face_value: Number(raw.face_value),
    start_date: raw.start_date,
    due_date: raw.due_date,
    currency: raw.currency || "ARS",
    notes: raw.notes || null,
    attribute_to_investment_id:
      raw.attribute_to_investment_id && raw.attribute_to_investment_id !== ""
        ? String(raw.attribute_to_investment_id)
        : null,
    bank: raw.bank || null,
    check_number: raw.check_number || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const v = parsed.data;
  if (v.face_value < v.paid_amount) {
    return { error: "El valor nominal no puede ser menor al monto pagado." };
  }

  const days = Math.max(
    1,
    (Date.parse(v.due_date) - Date.parse(v.start_date)) / 86400000,
  );
  const expected_return = v.face_value - v.paid_amount;
  const monthly_rate = (expected_return / v.paid_amount) * (30 / days);

  const supabase = await createClient();
  const counterpartyId = await resolveCounterpartyId(supabase, {
    id: v.counterparty_id,
    name: v.counterparty,
  });
  const { data: op, error } = await supabase
    .from("operations")
    .insert({
      kind: "check_purchase",
      counterparty: v.counterparty,
      counterparty_id: counterpartyId,
      currency: v.currency,
      amount: v.paid_amount,
      start_date: v.start_date,
      due_date: v.due_date,
      monthly_rate: Number(monthly_rate.toFixed(6)),
      expected_return,
      expected_total: v.face_value,
      status: "active",
      notes: v.notes,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("checks").insert({
    operation_id: op.id,
    drawer: v.counterparty,
    paid_amount: v.paid_amount,
    face_value: v.face_value,
    due_date: v.due_date,
    bank: v.bank,
    check_number: v.check_number,
  });

  if (v.attribute_to_investment_id) {
    await supabase.from("investment_operations").insert({
      investment_id: v.attribute_to_investment_id,
      operation_id: op.id,
      allocated_amount: v.paid_amount,
    });
  }

  await notifySafe({
    kind: "operation_created",
    title: `Cheque cargado: ${v.counterparty}`,
    body: `${fmtARS(v.paid_amount)} → VN ${fmtARS(v.face_value)} · vence ${v.due_date}`,
    url: `/colocaciones/${op.id}`,
  });

  revalidatePath("/colocaciones");
  revalidatePath("/vencimientos");
  revalidatePath("/dashboard");
  redirect("/colocaciones");
}

// =================================================================
// FX / Crypto
// =================================================================
const tradeSchema = z.object({
  flavor: z.enum(["fx", "crypto"]),
  side: z.enum(["buy", "sell"]),
  asset: z.string().min(1),
  units: z.number().positive(),
  unit_price: z.number().positive(),
  date: z.string().min(1),
  counterparty: z.string().nullable().optional(),
  counterparty_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  attribute_to_investment_id: z.string().uuid().nullable().optional(),
});

export async function createTradeAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = tradeSchema.safeParse({
    flavor: raw.flavor,
    side: raw.side,
    asset: raw.asset,
    units: Number(raw.units),
    unit_price: Number(raw.unit_price),
    date: raw.date,
    counterparty: raw.counterparty || null,
    counterparty_id:
      raw.counterparty_id && raw.counterparty_id !== ""
        ? String(raw.counterparty_id)
        : null,
    notes: raw.notes || null,
    attribute_to_investment_id:
      raw.attribute_to_investment_id && raw.attribute_to_investment_id !== ""
        ? String(raw.attribute_to_investment_id)
        : null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const v = parsed.data;
  const amountARS = v.units * v.unit_price;

  const opKind =
    v.flavor === "fx"
      ? v.side === "buy"
        ? "fx_buy"
        : "fx_sell"
      : v.side === "buy"
        ? "crypto_buy"
        : "crypto_sell";

  const supabase = await createClient();
  const counterpartyId = v.counterparty
    ? await resolveCounterpartyId(supabase, {
        id: v.counterparty_id,
        name: v.counterparty,
      })
    : null;
  const { data: op, error } = await supabase
    .from("operations")
    .insert({
      kind: opKind,
      counterparty: v.counterparty,
      counterparty_id: counterpartyId,
      currency: "ARS",
      amount: amountARS,
      start_date: v.date,
      status: "collected",
      notes: v.notes,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.from("fx_trades").insert({
    operation_id: op.id,
    side: v.side,
    asset: v.asset.toUpperCase(),
    quote_currency: "ARS",
    unit_price: v.unit_price,
    units: v.units,
  });

  if (v.attribute_to_investment_id && v.side === "buy") {
    await supabase.from("investment_operations").insert({
      investment_id: v.attribute_to_investment_id,
      operation_id: op.id,
      allocated_amount: amountARS,
    });
  }

  const sideLabel = v.side === "buy" ? "Compra" : "Venta";
  await notifySafe({
    kind: "operation_created",
    title: `${sideLabel} de ${v.asset.toUpperCase()} ${v.flavor === "crypto" ? "(USDT)" : ""}`,
    body: `${v.units.toLocaleString("es-AR")} unidades × ${v.unit_price} = ${fmtARS(amountARS)}`,
    url: `/colocaciones/${op.id}`,
  });

  revalidatePath("/colocaciones");
  revalidatePath("/dashboard");
  redirect("/colocaciones");
}

// =================================================================
// Cambio de estado
// =================================================================
export async function setOperationStatusAction(
  operationId: string,
  newStatus: "collected" | "in_default" | "reinvested" | "cancelled" | "active",
  actualReturn?: number,
) {
  const supabase = await createClient();
  const update: Record<string, unknown> = { status: newStatus };
  if (actualReturn != null) {
    update.actual_return = actualReturn;
  }

  // Buscar la operación antes para construir el mensaje de notificación
  const { data: opPrevRaw } = await supabase
    .from("operations")
    .select("counterparty, currency, amount, expected_total, expected_return, kind")
    .eq("id", operationId)
    .single();
  type Prev = {
    counterparty: string | null;
    currency: string;
    amount: number;
    expected_total: number | null;
    expected_return: number | null;
    kind: string;
  };
  const prev = opPrevRaw as unknown as Prev | null;

  const { error } = await supabase.from("operations").update(update).eq("id", operationId);
  if (error) return { error: error.message };

  if (prev) {
    if (newStatus === "collected") {
      const total = Number(prev.expected_total ?? prev.amount);
      const ret = actualReturn ?? Number(prev.expected_return ?? 0);
      const expected = Number(prev.expected_return ?? 0);
      const deviation = expected > 0 ? (ret - expected) / expected : 0;
      await notifySafe({
        kind: "operation_collected",
        title: `✅ Cobrada: ${prev.counterparty ?? "—"}`,
        body: `${fmtARS(total)} · rendimiento ${fmtARS(ret)}${
          Math.abs(deviation) > 0.05
            ? ` (desvío ${(deviation * 100).toFixed(1)}%)`
            : ""
        }`,
        url: `/colocaciones/${operationId}`,
      });
    } else if (newStatus === "in_default") {
      await notifySafe({
        kind: "operation_in_default",
        title: `🚨 En mora: ${prev.counterparty ?? "—"}`,
        body: `${fmtARS(Number(prev.amount))} marcada como mora`,
        url: `/colocaciones/${operationId}`,
        requireInteraction: true,
      });
    }
  }

  revalidatePath("/vencimientos");
  revalidatePath("/colocaciones");
  revalidatePath("/dashboard");
  revalidatePath(`/colocaciones/${operationId}`);
  return { ok: true };
}

// =================================================================
// Update genérico
// =================================================================
const updateCheckSchema = z.object({
  counterparty: z.string().min(1),
  paid_amount: z.number().positive(),
  face_value: z.number().positive(),
  start_date: z.string().min(1),
  due_date: z.string().min(1),
  notes: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  check_number: z.string().nullable().optional(),
});

export async function updateCheckAction(operationId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateCheckSchema.safeParse({
    counterparty: raw.counterparty,
    paid_amount: Number(raw.paid_amount),
    face_value: Number(raw.face_value),
    start_date: raw.start_date,
    due_date: raw.due_date,
    notes: raw.notes || null,
    bank: raw.bank || null,
    check_number: raw.check_number || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = parsed.data;
  if (v.face_value < v.paid_amount) {
    return { error: "El valor nominal no puede ser menor al monto pagado." };
  }

  const days = Math.max(1, (Date.parse(v.due_date) - Date.parse(v.start_date)) / 86400000);
  const expected_return = v.face_value - v.paid_amount;
  const monthly_rate = (expected_return / v.paid_amount) * (30 / days);

  const supabase = await createClient();
  const { error: opErr } = await supabase
    .from("operations")
    .update({
      counterparty: v.counterparty,
      amount: v.paid_amount,
      start_date: v.start_date,
      due_date: v.due_date,
      monthly_rate: Number(monthly_rate.toFixed(6)),
      expected_return,
      expected_total: v.face_value,
      notes: v.notes,
    })
    .eq("id", operationId);
  if (opErr) return { error: opErr.message };

  await supabase
    .from("checks")
    .update({
      drawer: v.counterparty,
      paid_amount: v.paid_amount,
      face_value: v.face_value,
      due_date: v.due_date,
      bank: v.bank,
      check_number: v.check_number,
    })
    .eq("operation_id", operationId);

  revalidatePath("/colocaciones");
  revalidatePath("/vencimientos");
  revalidatePath("/dashboard");
  revalidatePath(`/colocaciones/${operationId}`);
  redirect(`/colocaciones/${operationId}`);
}

const updateTradeSchema = z.object({
  side: z.enum(["buy", "sell"]),
  asset: z.string().min(1),
  units: z.number().positive(),
  unit_price: z.number().positive(),
  date: z.string().min(1),
  counterparty: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function updateTradeAction(operationId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateTradeSchema.safeParse({
    side: raw.side,
    asset: raw.asset,
    units: Number(raw.units),
    unit_price: Number(raw.unit_price),
    date: raw.date,
    counterparty: raw.counterparty || null,
    notes: raw.notes || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const v = parsed.data;
  const amountARS = v.units * v.unit_price;

  const supabase = await createClient();
  const { error: opErr } = await supabase
    .from("operations")
    .update({
      counterparty: v.counterparty,
      amount: amountARS,
      start_date: v.date,
      notes: v.notes,
    })
    .eq("id", operationId);
  if (opErr) return { error: opErr.message };

  await supabase
    .from("fx_trades")
    .update({
      side: v.side,
      asset: v.asset.toUpperCase(),
      unit_price: v.unit_price,
      units: v.units,
    })
    .eq("operation_id", operationId);

  revalidatePath("/colocaciones");
  revalidatePath("/dashboard");
  revalidatePath(`/colocaciones/${operationId}`);
  redirect(`/colocaciones/${operationId}`);
}

// =================================================================
// Delete (cascade vía foreign key on delete cascade en checks/fx_trades)
// =================================================================
export async function deleteOperationAction(operationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("operations").delete().eq("id", operationId);
  if (error) return { error: error.message };
  revalidatePath("/colocaciones");
  revalidatePath("/vencimientos");
  revalidatePath("/dashboard");
  redirect("/colocaciones");
}
