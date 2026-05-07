"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const cpSchema = z.object({
  full_name: z.string().min(1, "Nombre requerido"),
  alias: z.string().nullable().optional(),
  document_type: z.string().nullable().optional(),
  document_number: z.string().nullable().optional(),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  phone: z.string().nullable().optional(),
  bank: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  risk_level: z.enum(["low", "normal", "high"]).default("normal"),
});

function pickFields(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return {
    full_name: String(raw.full_name ?? "").trim(),
    alias: raw.alias ? String(raw.alias) : null,
    document_type: raw.document_type ? String(raw.document_type) : null,
    document_number: raw.document_number ? String(raw.document_number) : null,
    email: raw.email ? String(raw.email) : null,
    phone: raw.phone ? String(raw.phone) : null,
    bank: raw.bank ? String(raw.bank) : null,
    notes: raw.notes ? String(raw.notes) : null,
    risk_level: (raw.risk_level as "low" | "normal" | "high") ?? "normal",
  };
}

export async function createCounterpartyAction(formData: FormData) {
  const parsed = cpSchema.safeParse(pickFields(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("counterparties")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/contrapartes");
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateCounterpartyAction(
  id: string,
  formData: FormData,
) {
  const parsed = cpSchema.safeParse(pickFields(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("counterparties")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/contrapartes");
  revalidatePath(`/contrapartes/${id}`);
  return { ok: true };
}

export async function deleteCounterpartyAction(id: string) {
  const supabase = await createClient();
  const { data: ops } = await supabase
    .from("operations")
    .select("id")
    .eq("counterparty_id", id)
    .limit(1);
  if (ops && ops.length > 0) {
    return {
      error:
        "No se puede borrar: la contraparte tiene operaciones cargadas. Marcalas o desvinculalas primero.",
    };
  }
  const { error } = await supabase.from("counterparties").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/contrapartes");
  return { ok: true };
}

export async function toggleCounterpartyActiveAction(
  id: string,
  isActive: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("counterparties")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/contrapartes");
  revalidatePath(`/contrapartes/${id}`);
  return { ok: true };
}
