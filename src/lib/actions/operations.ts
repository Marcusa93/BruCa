"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// =================================================================
// Cheque
// =================================================================
const checkSchema = z.object({
  counterparty: z.string().min(1, "Contraparte requerida"),
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
  const { data: op, error } = await supabase
    .from("operations")
    .insert({
      kind: "check_purchase",
      counterparty: v.counterparty,
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
  const { data: op, error } = await supabase
    .from("operations")
    .insert({
      kind: opKind,
      counterparty: v.counterparty,
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
  const { error } = await supabase.from("operations").update(update).eq("id", operationId);
  if (error) return { error: error.message };
  revalidatePath("/vencimientos");
  revalidatePath("/colocaciones");
  revalidatePath("/dashboard");
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
