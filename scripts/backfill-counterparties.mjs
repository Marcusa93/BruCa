// Backfill: extrae los nombres únicos de operations.counterparty,
// crea los registros en counterparties y vincula cada operación al ID.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
    }),
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function main() {
  console.log("→ Leyendo operations…");
  const { data: ops, error } = await sb
    .from("operations")
    .select("id, counterparty, counterparty_id, kind");
  if (error) throw error;

  // Excluimos contrapartes "—" o vacías y las de USDT que no tienen contraparte real
  const skipNames = new Set(["—", "-", ""]);
  const uniqueNames = new Set();
  for (const o of ops) {
    const name = (o.counterparty ?? "").trim();
    if (skipNames.has(name)) continue;
    uniqueNames.add(name);
  }
  console.log(`Encontradas ${uniqueNames.size} contrapartes únicas:`);
  console.log(`  ${[...uniqueNames].join(", ")}`);

  // Crear contrapartes (si no existen)
  const created = new Map();
  for (const name of uniqueNames) {
    // ¿Ya existe?
    const { data: existing } = await sb
      .from("counterparties")
      .select("id")
      .ilike("full_name", name)
      .limit(1);
    if (existing && existing.length > 0) {
      created.set(name, existing[0].id);
      console.log(`  ✓ Ya existía: ${name}`);
      continue;
    }
    const { data: newRow, error: insertErr } = await sb
      .from("counterparties")
      .insert({ full_name: name })
      .select("id")
      .single();
    if (insertErr) {
      console.error(`  ✗ ${name}: ${insertErr.message}`);
      continue;
    }
    created.set(name, newRow.id);
    console.log(`  + Creada: ${name}`);
  }

  // Vincular operaciones (sólo las que no tienen counterparty_id ya seteado)
  console.log("\n→ Vinculando operaciones…");
  let linked = 0;
  for (const op of ops) {
    if (op.counterparty_id) continue;
    const name = (op.counterparty ?? "").trim();
    const cpId = created.get(name);
    if (!cpId) continue;
    const { error: updateErr } = await sb
      .from("operations")
      .update({ counterparty_id: cpId })
      .eq("id", op.id);
    if (updateErr) {
      console.error(`  ✗ ${op.id}: ${updateErr.message}`);
      continue;
    }
    linked++;
  }
  console.log(`  Vinculadas ${linked} operaciones.`);

  // Resumen
  const { count } = await sb
    .from("counterparties")
    .select("*", { count: "exact", head: true });
  console.log(`\n✓ Backfill completo. Total contrapartes: ${count}`);
}

main().catch((e) => {
  console.error("\nFallo el backfill:", e);
  process.exit(1);
});
