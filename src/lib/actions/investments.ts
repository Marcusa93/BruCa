"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { expectedTotal } from "@/lib/finance/calculations";

const investmentSchema = z.object({
  investor_id: z.string().uuid("Inversor requerido"),
  currency: z.enum(["ARS", "USD", "EUR", "BRL"]),
  amount: z.number().positive("Monto debe ser mayor a 0"),
  entry_date: z.string().min(1),
  estimated_term_days: z.number().int().min(1).max(3650),
  monthly_rate: z.number().min(0).max(1),
  notes: z.string().nullable().optional(),
});

export async function createInvestmentAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = investmentSchema.safeParse({
    investor_id: raw.investor_id,
    currency: raw.currency,
    amount: Number(raw.amount),
    entry_date: raw.entry_date,
    estimated_term_days: Number(raw.estimated_term_days),
    monthly_rate: Number(raw.monthly_rate) / 100, // form sends % as 4
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const v = parsed.data;
  const committed = expectedTotal(v.amount, v.monthly_rate, v.estimated_term_days);
  const dueDate = new Date(v.entry_date);
  dueDate.setDate(dueDate.getDate() + v.estimated_term_days);

  const supabase = await createClient();
  const { error } = await supabase.from("investments").insert({
    ...v,
    committed_return_amount: committed,
    committed_return_date: dueDate.toISOString().slice(0, 10),
    status: "active",
  });
  if (error) return { error: error.message };
  revalidatePath("/inversiones");
  revalidatePath("/dashboard");
  revalidatePath("/inversores");
  redirect("/inversiones");
}

export async function returnInvestmentAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("investments")
    .update({ status: "returned" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inversiones");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateInvestmentAction(id: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = investmentSchema.safeParse({
    investor_id: raw.investor_id,
    currency: raw.currency,
    amount: Number(raw.amount),
    entry_date: raw.entry_date,
    estimated_term_days: Number(raw.estimated_term_days),
    monthly_rate: Number(raw.monthly_rate) / 100,
    notes: raw.notes || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const v = parsed.data;
  const committed = expectedTotal(v.amount, v.monthly_rate, v.estimated_term_days);
  const dueDate = new Date(v.entry_date);
  dueDate.setDate(dueDate.getDate() + v.estimated_term_days);

  const supabase = await createClient();
  const { error } = await supabase
    .from("investments")
    .update({
      ...v,
      committed_return_amount: committed,
      committed_return_date: dueDate.toISOString().slice(0, 10),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/inversiones");
  revalidatePath("/dashboard");
  revalidatePath("/inversores");
  revalidatePath(`/inversiones/${id}`);
  redirect("/inversiones");
}

export async function deleteInvestmentAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/inversiones");
  revalidatePath("/dashboard");
  revalidatePath("/inversores");
  redirect("/inversiones");
}
