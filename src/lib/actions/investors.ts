"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
