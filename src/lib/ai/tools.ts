/**
 * Tools tipadas que el modelo puede invocar.
 * Formato OpenAI function-calling (compatible con OpenRouter).
 */

export const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_dashboard_kpis",
      description:
        "Devuelve los KPIs ejecutivos por moneda: capital recibido, capital colocado activo, capital en caja, compromisos pendientes de devolución a inversores.",
      parameters: {
        type: "object",
        properties: {
          currency: {
            type: "string",
            enum: ["ARS", "USD", "EUR", "BRL", "ALL"],
            description: "Moneda a consultar. ALL devuelve todas.",
          },
        },
        required: ["currency"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_upcoming_maturities",
      description:
        "Lista las colocaciones que vencen dentro de los próximos N días, ordenadas por fecha. Excluye las ya cobradas, reinvertidas o canceladas.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "integer", minimum: 1, maximum: 365 },
          currency: { type: "string", enum: ["ARS", "USD", "EUR", "BRL", "ALL"] },
          limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        },
        required: ["days", "currency"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_overdue_or_default_placements",
      description: "Lista colocaciones con estado 'overdue' o 'in_default'.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "top_investors_by_capital",
      description: "Ranking de inversores por capital aportado activo.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
          currency: { type: "string", enum: ["ARS", "USD", "ALL"] },
        },
        required: ["currency"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "capital_by_currency",
      description: "Suma de capital activo recibido y colocado, segregado por moneda.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "treasury_latest",
      description: "Saldo de tesorería del último arqueo cargado, por moneda.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deviation_ranking",
      description:
        "Ranking de operaciones cerradas con mayor desvío entre rendimiento esperado y real.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "simulate_reinvestment",
      description:
        "Simula la evolución de un capital reinvirtiendo intereses durante varios meses con tasa mensual lineal. Esto NO consulta la base, es una proyección.",
      parameters: {
        type: "object",
        properties: {
          capital: { type: "number", minimum: 0 },
          monthly_rate: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Tasa mensual como decimal. 0.04 = 4%.",
          },
          months: { type: "integer", minimum: 1, maximum: 60 },
          reinvest_interest: { type: "boolean", default: true },
          currency: { type: "string", enum: ["ARS", "USD"], default: "ARS" },
        },
        required: ["capital", "monthly_rate", "months"],
        additionalProperties: false,
      },
    },
  },
] as const;

export type ToolName = (typeof TOOLS)[number]["function"]["name"];
