"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendPushToAll } from "@/lib/push/server";

async function notifySafe(payload: Parameters<typeof sendPushToAll>[0]) {
  try {
    await sendPushToAll(payload);
  } catch (e) {
    console.warn("[push] no pude enviar:", (e as Error).message);
  }
}

const investorSchema = z.object({
  full_name: z.string().min(1, "Nombre requerido"),
  document_type: z.string().nullable().optional(),
  document_number: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function createInvestorAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = investorSchema.safeParse({
    full_name: raw.full_name,
    document_type: raw.document_type || null,
    document_number: raw.document_number || null,
    email: raw.email || null,
    phone: raw.phone || null,
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("investors").insert(parsed.data);
  if (error) return { error: error.message };
  await notifySafe({
    kind: "investor_created",
    title: `Nuevo inversor: ${parsed.data.full_name}`,
    body: parsed.data.email
      ? `Contacto: ${parsed.data.email}`
      : "Cargado en el sistema",
    url: "/inversores",
  });
  revalidatePath("/inversores");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleInvestorActiveAction(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("investors")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inversores");
  revalidatePath(`/inversores/${id}`);
  return { ok: true };
}

export async function updateInvestorAction(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = investorSchema.safeParse({
    full_name: raw.full_name,
    document_type: raw.document_type || null,
    document_number: raw.document_number || null,
    email: raw.email || null,
    phone: raw.phone || null,
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("investors").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inversores");
  revalidatePath(`/inversores/${id}`);
  return { ok: true };
}

export async function deleteInvestorAction(id: string) {
  const supabase = await createClient();
  // Verificamos que no tenga inversiones activas
  const { data: invs } = await supabase
    .from("investments")
    .select("id")
    .eq("investor_id", id)
    .limit(1);
  if (invs && invs.length > 0) {
    return {
      error:
        "No se puede borrar: el inversor tiene inversiones cargadas. Marcá las inversiones como devueltas o canceladas primero.",
    };
  }
  const { error } = await supabase.from("investors").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inversores");
  return { ok: true, redirect: "/inversores" };
}
