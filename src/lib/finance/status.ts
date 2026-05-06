export type PlacementStatus =
  | "active"
  | "near_due"
  | "overdue"
  | "in_default"
  | "collected"
  | "reinvested"
  | "cancelled";

export type InvestmentStatus =
  | "active"
  | "partially_placed"
  | "fully_placed"
  | "returned"
  | "cancelled";

const TERMINAL_PLACEMENT: PlacementStatus[] = ["collected", "reinvested", "cancelled", "in_default"];

export function daysUntil(date: Date | string, today: Date = new Date()): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const ms = target.setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function derivePlacementStatus(input: {
  dueDate: Date | string;
  status: PlacementStatus;
  today?: Date;
}): PlacementStatus {
  if (TERMINAL_PLACEMENT.includes(input.status)) return input.status;
  const days = daysUntil(input.dueDate, input.today ?? new Date());
  if (days < 0) return "overdue";
  if (days <= 7) return "near_due";
  return "active";
}

export interface StatusVisual {
  label: string;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
}

export const placementStatusVisual: Record<PlacementStatus, StatusVisual> = {
  active: { label: "Activa", tone: "neutral" },
  near_due: { label: "Por vencer", tone: "warning" },
  overdue: { label: "Vencida", tone: "warning" },
  in_default: { label: "En mora", tone: "danger" },
  collected: { label: "Cobrada", tone: "success" },
  reinvested: { label: "Reinvertida", tone: "info" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const investmentStatusVisual: Record<InvestmentStatus, StatusVisual> = {
  active: { label: "Activa", tone: "neutral" },
  partially_placed: { label: "Colocada parcial", tone: "info" },
  fully_placed: { label: "Colocada", tone: "info" },
  returned: { label: "Devuelta", tone: "success" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};
