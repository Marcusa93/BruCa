// Seed inicial extraído de TESORO.xlsx (22/04/2026).
// Uso: node scripts/seed.mjs
// Lee credenciales de .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
//
// Inserta: 2 inversores (VIERA, LUAL), 2 inversiones, 13 operaciones (cheques + FX + USDT),
// detalle de cheques y fx_trades, vinculación investment ↔ operations, y arqueo de caja.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Cargar .env.local manualmente (sin dependencia)
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const eq = l.indexOf("=");
      return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// ===== Helpers =====
async function upsert(table, rows, conflict) {
  const { data, error } = await sb
    .from(table)
    .upsert(rows, { onConflict: conflict, ignoreDuplicates: false })
    .select();
  if (error) {
    console.error(`✗ ${table}:`, error.message);
    throw error;
  }
  console.log(`✓ ${table} (${data?.length ?? 0} filas)`);
  return data;
}

async function insertReturning(table, rows) {
  const { data, error } = await sb.from(table).insert(rows).select();
  if (error) {
    console.error(`✗ ${table}:`, error.message);
    throw error;
  }
  console.log(`✓ ${table} (${data?.length ?? 0} filas)`);
  return data;
}

// ===== Datos =====

// UUIDs deterministas
const ID = {
  invVIERA: "11111111-1111-1111-1111-111111111111",
  invLUAL: "22222222-2222-2222-2222-222222222222",
  investmentVIERA: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  investmentLUAL: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  // operations:
  opMosta: "11111111-aaaa-4aaa-aaaa-100000000001",
  opAlexis: "11111111-aaaa-4aaa-aaaa-100000000002",
  opCharco: "11111111-aaaa-4aaa-aaaa-100000000003",
  opEzequiel: "11111111-aaaa-4aaa-aaaa-100000000004",
  opMaxi: "11111111-aaaa-4aaa-aaaa-100000000005",
  opFXBuy300: "11111111-bbbb-4bbb-bbbb-200000000001",
  opFXBuy2000: "11111111-bbbb-4bbb-bbbb-200000000002",
  opFXSell2000: "11111111-bbbb-4bbb-bbbb-200000000003",
  opFXBuy700: "11111111-bbbb-4bbb-bbbb-200000000004",
  opFXSell100: "11111111-bbbb-4bbb-bbbb-200000000005",
  opCryptoSell1000: "11111111-cccc-4ccc-cccc-300000000001",
  opCryptoBuy11k: "11111111-cccc-4ccc-cccc-300000000002",
  opCryptoSell5k: "11111111-cccc-4ccc-cccc-300000000003",
  // cash count:
  cashCount: "ddddddd1-dddd-4ddd-dddd-dddddddddddd",
};

async function clearAll() {
  console.log("→ Limpiando data previa...");
  // Orden: dependencias hacia tablas raíz
  for (const t of [
    "cash_movements",
    "cash_count_lines",
    "cash_counts",
    "investment_operations",
    "checks",
    "fx_trades",
    "payments",
    "reinvestments",
    "operations",
    "investments",
    "investors",
  ]) {
    const { error } = await sb.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn(`  (${t}) ${error.message}`);
  }
}

async function seedInvestors() {
  await upsert(
    "investors",
    [
      { id: ID.invVIERA, full_name: "VIERA", is_active: true, notes: "Inversor activo" },
      { id: ID.invLUAL, full_name: "LUAL", is_active: true, notes: "Inversor activo" },
    ],
    "id",
  );
}

async function seedInvestments() {
  await upsert(
    "investments",
    [
      {
        id: ID.investmentVIERA,
        investor_id: ID.invVIERA,
        currency: "ARS",
        amount: 185760000,
        entry_date: "2026-05-05",
        estimated_term_days: 30,
        monthly_rate: 0.04,
        committed_return_amount: 193190400,
        committed_return_date: "2026-06-05",
        status: "partially_placed",
        notes: "VIERA · 4% mensual a 30 días · DEV 05/06",
      },
      {
        id: ID.investmentLUAL,
        investor_id: ID.invLUAL,
        currency: "ARS",
        amount: 70300000,
        entry_date: "2026-04-16",
        estimated_term_days: 30,
        monthly_rate: 0.04,
        committed_return_amount: 73112000,
        committed_return_date: "2026-05-16",
        status: "active",
        notes: "LUAL · 4% mensual a 30 días · DEV 16/05",
      },
    ],
    "id",
  );
}

async function seedOperations() {
  // === Cheques (check_purchase) ===
  const cheques = [
    {
      id: ID.opMosta,
      counterparty: "Mosta Padilla",
      paid: 60595000,
      face: 63892970,
      start: "2026-05-05",
      due: "2026-06-04",
    },
    {
      id: ID.opAlexis,
      counterparty: "Alexis Carlino",
      paid: 2910000,
      face: 3275040,
      start: "2026-05-05",
      due: "2026-06-04",
    },
    {
      id: ID.opCharco,
      counterparty: "El Charco Bebidas",
      paid: 15000000,
      face: 17000000,
      start: "2026-05-05",
      due: "2026-07-04",
    },
    {
      id: ID.opEzequiel,
      counterparty: "Ezequiel Castro",
      paid: 4038167.14,
      face: 4450000,
      start: "2026-05-05",
      due: "2026-06-19",
    },
    {
      id: ID.opMaxi,
      counterparty: "Maxi Sanchez",
      paid: 13580370.87,
      face: 15000000,
      start: "2026-05-06",
      due: "2026-07-05",
    },
  ];

  // Calcular días + tasa implícita por cheque
  const chequeOps = cheques.map((c) => {
    const days =
      (Date.parse(c.due) - Date.parse(c.start)) / (1000 * 60 * 60 * 24);
    const expectedReturn = c.face - c.paid;
    const monthlyRate = (expectedReturn / c.paid) * (30 / days);
    return {
      id: c.id,
      kind: "check_purchase",
      counterparty: c.counterparty,
      currency: "ARS",
      amount: c.paid,
      start_date: c.start,
      due_date: c.due,
      monthly_rate: Number(monthlyRate.toFixed(6)),
      expected_return: expectedReturn,
      expected_total: c.face,
      status: "active",
      notes: `Cheque · VN $${c.face.toLocaleString("es-AR")}`,
    };
  });

  // === FX trades ===
  const fxOps = [
    {
      id: ID.opFXBuy300,
      kind: "fx_buy",
      counterparty: "Alejandro Sad",
      currency: "ARS",
      amount: 420000,
      start_date: "2026-05-05",
      status: "collected",
      notes: "Compra 300 USD a 1400",
      fx: { side: "buy", asset: "USD", unit_price: 1400, units: 300 },
    },
    {
      id: ID.opFXBuy2000,
      kind: "fx_buy",
      counterparty: "Jose Calliera",
      currency: "ARS",
      amount: 2800000,
      start_date: "2026-05-05",
      status: "collected",
      notes: "Compra 2000 USD a 1400",
      fx: { side: "buy", asset: "USD", unit_price: 1400, units: 2000 },
    },
    {
      id: ID.opFXSell2000,
      kind: "fx_sell",
      counterparty: "Nico Gonzalez",
      currency: "ARS",
      amount: 2840000,
      start_date: "2026-05-05",
      status: "collected",
      notes: "Venta 2000 USD a 1420",
      fx: { side: "sell", asset: "USD", unit_price: 1420, units: 2000 },
    },
    {
      id: ID.opFXBuy700,
      kind: "fx_buy",
      counterparty: "Flavia Rivadeneira",
      currency: "ARS",
      amount: 987000,
      start_date: "2026-05-05",
      status: "collected",
      notes: "Compra 700 USD a 1410",
      fx: { side: "buy", asset: "USD", unit_price: 1410, units: 700 },
    },
    {
      id: ID.opFXSell100,
      kind: "fx_sell",
      counterparty: "Leche Espeche",
      currency: "ARS",
      amount: 143000,
      start_date: "2026-05-06",
      status: "collected",
      notes: "Venta 100 USD a 1430",
      fx: { side: "sell", asset: "USD", unit_price: 1430, units: 100 },
    },
  ];

  // === Crypto / USDT ===
  const cryptoOps = [
    {
      id: ID.opCryptoSell1000,
      kind: "crypto_sell",
      counterparty: "—",
      currency: "ARS",
      amount: 1443528,
      start_date: "2026-05-05",
      status: "collected",
      notes: "Venta 1000 USDT (1476 -2,2%)",
      fx: { side: "sell", asset: "USDT", unit_price: 1443.528, units: 1000 },
    },
    {
      id: ID.opCryptoBuy11k,
      kind: "crypto_buy",
      counterparty: "—",
      currency: "ARS",
      amount: 16016000,
      start_date: "2026-05-06",
      status: "collected",
      notes: "Compra 11.000 USDT a 1456",
      fx: { side: "buy", asset: "USDT", unit_price: 1456, units: 11000 },
    },
    {
      id: ID.opCryptoSell5k,
      kind: "crypto_sell",
      counterparty: "—",
      currency: "ARS",
      amount: 7330000,
      start_date: "2026-05-06",
      status: "collected",
      notes: "Venta 5.000 USDT a 1466",
      fx: { side: "sell", asset: "USDT", unit_price: 1466, units: 5000 },
    },
  ];

  // Insertar operaciones
  const allOps = [...chequeOps, ...fxOps.map(stripFx), ...cryptoOps.map(stripFx)];
  await upsert("operations", allOps, "id");

  // Detalle de cheques
  const checkDetails = cheques.map((c) => ({
    operation_id: c.id,
    drawer: c.counterparty,
    paid_amount: c.paid,
    face_value: c.face,
    due_date: c.due,
    notes: "Cheque comprado",
  }));
  await upsert("checks", checkDetails, "operation_id");

  // Detalle de FX/crypto
  const fxDetails = [...fxOps, ...cryptoOps].map((o) => ({
    operation_id: o.id,
    side: o.fx.side,
    asset: o.fx.asset,
    quote_currency: "ARS",
    unit_price: o.fx.unit_price,
    units: o.fx.units,
    notes: o.notes,
  }));
  await upsert("fx_trades", fxDetails, "operation_id");

  return {
    chequeIds: cheques.map((c) => c.id),
    fxIds: fxOps.map((o) => o.id),
    cryptoIds: cryptoOps.map((o) => o.id),
    fxOps,
    cryptoOps,
  };
}

function stripFx(o) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fx, ...rest } = o;
  return rest;
}

async function seedInvestmentLinks(opsBundle) {
  // Vinculamos las "compras" de VIERA a su inversión.
  const buys = [
    { op: ID.opMosta, amount: 60595000 },
    { op: ID.opAlexis, amount: 2910000 },
    { op: ID.opCharco, amount: 15000000 },
    { op: ID.opEzequiel, amount: 4038167.14 },
    { op: ID.opMaxi, amount: 13580370.87 },
    { op: ID.opFXBuy300, amount: 420000 },
    { op: ID.opFXBuy2000, amount: 2800000 },
    { op: ID.opFXBuy700, amount: 987000 },
    { op: ID.opCryptoBuy11k, amount: 16016000 },
  ];
  await insertReturning(
    "investment_operations",
    buys.map((b) => ({
      investment_id: ID.investmentVIERA,
      operation_id: b.op,
      allocated_amount: b.amount,
    })),
  );
  void opsBundle;
}

async function seedCashCount() {
  await upsert(
    "cash_counts",
    [
      {
        id: ID.cashCount,
        count_date: "2026-04-22",
        notes: "Arqueo TESORO · planilla original",
      },
    ],
    "id",
  );

  // Mapear denominaciones por (currency, value)
  const { data: denoms, error } = await sb
    .from("denominations")
    .select("id, currency, value");
  if (error) throw error;
  const denomMap = new Map(
    (denoms ?? []).map((d) => [`${d.currency}:${Number(d.value)}`, d.id]),
  );

  // Líneas (sólo las denominaciones con cantidad > 0)
  const lines = [
    { currency: "ARS", value: 20000, bundles: 10, loose: 62 },
    { currency: "ARS", value: 10000, bundles: 62, loose: 58 },
    { currency: "ARS", value: 1000, bundles: 2, loose: 53 },
    { currency: "ARS", value: 500, bundles: 0, loose: 8 },
    { currency: "USD", value: 20, bundles: 0, loose: 2 },
  ].map((l) => {
    const denomination_id = denomMap.get(`${l.currency}:${l.value}`);
    if (!denomination_id) throw new Error(`Falta denominación ${l.currency} ${l.value}`);
    return {
      cash_count_id: ID.cashCount,
      denomination_id,
      bundles: l.bundles,
      loose: l.loose,
      bundle_size: 100,
    };
  });
  await upsert("cash_count_lines", lines, "cash_count_id,denomination_id");
}

async function main() {
  console.log("Conectando a", URL);
  await clearAll();
  await seedInvestors();
  await seedInvestments();
  const ops = await seedOperations();
  await seedInvestmentLinks(ops);
  await seedCashCount();

  // Resumen
  const { count: invCount } = await sb
    .from("investments")
    .select("*", { count: "exact", head: true });
  const { count: opCount } = await sb
    .from("operations")
    .select("*", { count: "exact", head: true });
  console.log("\n=== Seed completo ===");
  console.log(`  Inversores: 2 (VIERA, LUAL)`);
  console.log(`  Inversiones: ${invCount}`);
  console.log(`  Operaciones: ${opCount}`);
  console.log(`  Arqueo de caja: 22/04/2026 — $84.077.000 ARS · USD 40`);
}

main().catch((e) => {
  console.error("\nFallo el seed:", e);
  process.exit(1);
});
