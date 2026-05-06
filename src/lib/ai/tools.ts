/**
 * Tools tipadas que el modelo puede invocar (formato OpenAI / OpenRouter).
 * Lectura + escritura.
 */

export const TOOLS = [
  // ============ LECTURA ============
  {
    type: "function" as const,
    function: {
      name: "get_dashboard_kpis",
      description:
        "Devuelve los KPIs ejecutivos por moneda: capital recibido, capital colocado activo, capital en caja, compromisos pendientes de devolución a inversores. Usar cuando el usuario pide un panorama general o resumen.",
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
        "Lista las colocaciones (cheques principalmente) que vencen dentro de los próximos N días, ordenadas por fecha. Excluye cobradas, reinvertidas o canceladas. Usar para preguntas sobre vencimientos próximos, esta semana, este mes.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "integer", minimum: 1, maximum: 365 },
          currency: { type: "string", enum: ["ARS", "USD", "EUR", "BRL", "ALL"] },
          limit: { type: "integer", minimum: 1, maximum: 50 },
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
      description: "Lista colocaciones con estado vencido o en mora.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 50 },
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
          limit: { type: "integer", minimum: 1, maximum: 20 },
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
      description: "Ranking de operaciones cerradas con mayor desvío entre rendimiento esperado y real.",
      parameters: {
        type: "object",
        properties: { limit: { type: "integer", minimum: 1, maximum: 20 } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_operation",
      description:
        "Busca una operación existente por contraparte (string parcial), tipo, monto aproximado o fecha. Usar cuando el usuario menciona una operación por descripción ('el cheque de Mosta Padilla') y necesitamos identificarla para actualizarla.",
      parameters: {
        type: "object",
        properties: {
          counterparty_contains: { type: "string" },
          kind: {
            type: "string",
            enum: ["check_purchase", "fx_buy", "fx_sell", "crypto_buy", "crypto_sell", "other"],
          },
          min_amount: { type: "number" },
          max_amount: { type: "number" },
          limit: { type: "integer", minimum: 1, maximum: 20 },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_investor",
      description:
        "Busca un inversor por nombre (búsqueda parcial, case-insensitive). Devuelve el ID del inversor.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "simulate_reinvestment",
      description:
        "Proyecta la evolución de un capital reinvirtiendo intereses durante varios meses con tasa mensual lineal. NO consulta la base.",
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
          reinvest_interest: { type: "boolean" },
          currency: { type: "string", enum: ["ARS", "USD"] },
        },
        required: ["capital", "monthly_rate", "months"],
        additionalProperties: false,
      },
    },
  },

  // ============ ESCRITURA ============
  {
    type: "function" as const,
    function: {
      name: "create_investor",
      description:
        "Crea un nuevo inversor. Sólo cuando el usuario explícitamente quiere registrar un cliente nuevo.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          document_number: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          notes: { type: "string" },
        },
        required: ["full_name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_investment",
      description:
        "Carga una inversión recibida de un cliente. Si no se conoce el ID del inversor, podés pasar 'investor_name' y se busca por nombre. Si tampoco existe, el sistema lo crea.",
      parameters: {
        type: "object",
        properties: {
          investor_id: { type: "string", description: "UUID si ya lo conocés" },
          investor_name: {
            type: "string",
            description: "Nombre si no tenés el ID — se busca o se crea automáticamente",
          },
          currency: { type: "string", enum: ["ARS", "USD", "EUR", "BRL"] },
          amount: { type: "number", minimum: 0 },
          entry_date: { type: "string", description: "YYYY-MM-DD. Default: hoy." },
          term_days: { type: "integer", minimum: 1, maximum: 3650 },
          monthly_rate: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Decimal. 0.04 = 4%.",
          },
          committed_return_amount: {
            type: "number",
            description: "Si lo conocés explícito; si no, se calcula del rate y plazo.",
          },
          notes: { type: "string" },
        },
        required: ["currency", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_check_purchase",
      description: "Carga la compra de un cheque diferido.",
      parameters: {
        type: "object",
        properties: {
          counterparty: { type: "string" },
          paid_amount: { type: "number", minimum: 0 },
          face_value: { type: "number", minimum: 0 },
          currency: { type: "string", enum: ["ARS", "USD"] },
          start_date: { type: "string", description: "YYYY-MM-DD. Default: hoy." },
          due_date: { type: "string", description: "YYYY-MM-DD. Requerido." },
          attribute_to_investor: { type: "string", description: "Nombre del inversor para vincular" },
          notes: { type: "string" },
        },
        required: ["counterparty", "paid_amount", "face_value", "due_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_fx_trade",
      description:
        "Carga una operación de compra o venta de moneda extranjera (USD efectivo principalmente).",
      parameters: {
        type: "object",
        properties: {
          side: { type: "string", enum: ["buy", "sell"] },
          asset: { type: "string", enum: ["USD", "EUR", "BRL"] },
          units: { type: "number", minimum: 0 },
          unit_price: { type: "number", minimum: 0, description: "Precio en ARS por unidad" },
          counterparty: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD. Default: hoy." },
          attribute_to_investor: { type: "string" },
          notes: { type: "string" },
        },
        required: ["side", "asset", "units", "unit_price"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_crypto_trade",
      description: "Carga una operación de compra o venta de USDT u otra cripto.",
      parameters: {
        type: "object",
        properties: {
          side: { type: "string", enum: ["buy", "sell"] },
          asset: { type: "string", description: "USDT, BTC, ETH..." },
          units: { type: "number", minimum: 0 },
          unit_price: { type: "number", minimum: 0, description: "Precio en ARS por unidad" },
          counterparty: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD. Default: hoy." },
          attribute_to_investor: { type: "string" },
          notes: { type: "string" },
        },
        required: ["side", "asset", "units", "unit_price"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "register_payment",
      description:
        "Registra un pago (cobro o egreso) sobre una operación o inversión existente. Útil cuando se cobra un cheque o se devuelve capital a un inversor.",
      parameters: {
        type: "object",
        properties: {
          operation_id: { type: "string", description: "UUID de la operación" },
          investment_id: { type: "string", description: "UUID de la inversión" },
          direction: { type: "string", enum: ["incoming", "outgoing"] },
          concept: { type: "string", enum: ["principal", "interest", "mixed", "fee"] },
          amount: { type: "number", minimum: 0 },
          currency: { type: "string", enum: ["ARS", "USD", "EUR", "BRL"] },
          payment_date: { type: "string", description: "YYYY-MM-DD" },
          notes: { type: "string" },
        },
        required: ["direction", "concept", "amount", "currency", "payment_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "set_operation_status",
      description:
        "Cambia el estado de una operación existente. Usar para marcar como cobrada, en mora, reinvertida o cancelada.",
      parameters: {
        type: "object",
        properties: {
          operation_id: { type: "string" },
          new_status: {
            type: "string",
            enum: ["active", "near_due", "overdue", "in_default", "collected", "reinvested", "cancelled"],
          },
          actual_return: {
            type: "number",
            description: "Si se cobró, el retorno real percibido.",
          },
          notes: { type: "string" },
        },
        required: ["operation_id", "new_status"],
        additionalProperties: false,
      },
    },
  },
] as const;

export type ToolName = (typeof TOOLS)[number]["function"]["name"];
