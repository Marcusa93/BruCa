import type { Currency } from "@/lib/finance/formatters";
import type { InvestmentStatus, PlacementStatus } from "@/lib/finance/status";

export type { Currency, InvestmentStatus, PlacementStatus };

export type OperationKind =
  | "fx_buy"
  | "fx_sell"
  | "crypto_buy"
  | "crypto_sell"
  | "check_purchase"
  | "other";

export interface Investor {
  id: string;
  fullName: string;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Investment {
  id: string;
  investorId: string;
  currency: Currency;
  amount: number;
  entryDate: string;
  estimatedTermDays: number | null;
  monthlyRate: number;
  committedReturnAmount: number | null;
  committedReturnDate: string | null;
  status: InvestmentStatus;
  notes: string | null;
}

export interface Operation {
  id: string;
  kind: OperationKind;
  counterparty: string | null;
  currency: Currency;
  amount: number;
  startDate: string;
  dueDate: string | null;
  termDays: number | null;
  monthlyRate: number | null;
  expectedReturn: number | null;
  expectedTotal: number | null;
  actualReturn: number | null;
  status: PlacementStatus;
  notes: string | null;
}
