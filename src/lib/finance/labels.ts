/**
 * Labels de dominio para mostrar en la UI.
 * Una sola fuente de verdad — cada vez que se agrega un kind/risk/etc., se toca acá.
 */

export type OperationKind =
  | "check_purchase"
  | "fx_buy"
  | "fx_sell"
  | "crypto_buy"
  | "crypto_sell"
  | "other";

export type CounterpartyRisk = "low" | "normal" | "high";

export const operationKindLabel: Record<OperationKind, string> = {
  check_purchase: "Cheque",
  fx_buy: "Compra USD",
  fx_sell: "Venta USD",
  crypto_buy: "Compra USDT",
  crypto_sell: "Venta USDT",
  other: "Otro",
};

/** Tinte para badges/píldoras compactas en listados. */
export const operationKindTint: Record<OperationKind, string> = {
  check_purchase: "bg-brand-50 text-brand-800",
  fx_buy: "bg-info-bg text-info",
  fx_sell: "bg-success-bg text-success",
  crypto_buy: "bg-info-bg text-info",
  crypto_sell: "bg-success-bg text-success",
  other: "bg-surface-2 text-ink-2",
};

export function kindLabel(kind: string): string {
  return operationKindLabel[kind as OperationKind] ?? kind;
}

export const riskVisual: Record<
  CounterpartyRisk,
  { label: string; tone: "success" | "neutral" | "danger" }
> = {
  low: { label: "Bajo", tone: "success" },
  normal: { label: "Normal", tone: "neutral" },
  high: { label: "Alto", tone: "danger" },
};
