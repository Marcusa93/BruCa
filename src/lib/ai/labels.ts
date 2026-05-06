/**
 * Etiquetas en lenguaje natural para mostrar en la UI del chat.
 * Nunca exponemos el nombre técnico de la tool al usuario.
 */
export const TOOL_LABELS: Record<
  string,
  { running: string; ok: string; empty: string }
> = {
  // Lectura
  get_dashboard_kpis: {
    running: "Consultando panorama ejecutivo…",
    ok: "Panorama ejecutivo",
    empty: "Sin datos en el panorama",
  },
  list_upcoming_maturities: {
    running: "Buscando vencimientos próximos…",
    ok: "Vencimientos próximos",
    empty: "Sin vencimientos en el período",
  },
  list_overdue_or_default_placements: {
    running: "Buscando operaciones vencidas y en mora…",
    ok: "Operaciones vencidas / mora",
    empty: "Sin operaciones vencidas",
  },
  top_investors_by_capital: {
    running: "Calculando ranking de inversores…",
    ok: "Ranking de inversores",
    empty: "Sin inversores activos",
  },
  capital_by_currency: {
    running: "Sumando capital por moneda…",
    ok: "Capital por moneda",
    empty: "Sin capital cargado",
  },
  treasury_latest: {
    running: "Consultando arqueo de caja…",
    ok: "Arqueo de caja",
    empty: "Sin arqueos cargados",
  },
  deviation_ranking: {
    running: "Buscando desvíos esperado vs real…",
    ok: "Ranking de desvíos",
    empty: "Sin operaciones cerradas",
  },
  search_operation: {
    running: "Buscando operación…",
    ok: "Operación encontrada",
    empty: "Sin coincidencias",
  },
  find_investor: {
    running: "Buscando inversor…",
    ok: "Inversor encontrado",
    empty: "Sin coincidencias",
  },
  simulate_reinvestment: {
    running: "Calculando simulación…",
    ok: "Simulación de reinversión",
    empty: "Simulación",
  },

  // Escritura
  create_investor: {
    running: "Cargando nuevo inversor…",
    ok: "Inversor cargado",
    empty: "No se pudo cargar el inversor",
  },
  create_investment: {
    running: "Cargando nueva inversión…",
    ok: "Inversión cargada",
    empty: "No se pudo cargar la inversión",
  },
  create_check_purchase: {
    running: "Cargando compra de cheque…",
    ok: "Cheque cargado",
    empty: "No se pudo cargar el cheque",
  },
  create_fx_trade: {
    running: "Cargando operación de moneda…",
    ok: "Operación FX cargada",
    empty: "No se pudo cargar la operación",
  },
  create_crypto_trade: {
    running: "Cargando operación cripto…",
    ok: "Operación USDT cargada",
    empty: "No se pudo cargar la operación",
  },
  register_payment: {
    running: "Registrando pago…",
    ok: "Pago registrado",
    empty: "No se pudo registrar el pago",
  },
  set_operation_status: {
    running: "Actualizando estado de la operación…",
    ok: "Estado actualizado",
    empty: "No se pudo actualizar",
  },
};

export function labelFor(
  name: string,
  status: "running" | "ok" | "empty",
): string {
  const entry = TOOL_LABELS[name];
  if (!entry) {
    // Fallback genérico, NO expone el nombre técnico
    if (status === "running") return "Consultando…";
    if (status === "ok") return "Listo";
    return "Sin datos";
  }
  return entry[status];
}
