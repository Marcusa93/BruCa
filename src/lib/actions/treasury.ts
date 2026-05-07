"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CashCountLineInput {
  denomination_id: string;
  bundles: number;
  loose: number;
  bundle_size: number;
}

export async function createCashCountAction(formData: FormData) {
  const supabase = await createClient();

  const count_date = String(formData.get("count_date") ?? "");
  const notes = String(formData.get("notes") ?? "") || null;
  if (!count_date) return { error: "Fecha requerida." };

  // Crear el arqueo
  const { data: countRow, error: countErr } = await supabase
    .from("cash_counts")
    .insert({ count_date, notes })
    .select("id")
    .single();
  if (countErr) return { error: countErr.message };

  // Recolectar líneas: campo "bundles_<denomId>" y "loose_<denomId>"
  const lines: CashCountLineInput[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("bundles_")) {
      const id = key.slice(8);
      const bundles = Number(value) || 0;
      const loose = Number(formData.get(`loose_${id}`)) || 0;
      const bundle_size = Number(formData.get(`bundle_size_${id}`)) || 100;
      if (bundles > 0 || loose > 0) {
        lines.push({ denomination_id: id, bundles, loose, bundle_size });
      }
    }
  }

  if (lines.length > 0) {
    const linesPayload = lines.map((l) => ({
      cash_count_id: countRow.id,
      ...l,
    }));
    const { error: linesErr } = await supabase
      .from("cash_count_lines")
      .insert(linesPayload);
    if (linesErr) return { error: linesErr.message };
  }

  revalidatePath("/tesoreria");
  revalidatePath("/dashboard");
  redirect("/tesoreria");
}
