/**
 * Cálculos financieros puros.
 * Modelo lineal: rendimiento = capital * tasa_mensual * dias / 30
 * Tasas se almacenan como decimal (4% mensual = 0.04).
 */

export const DAYS_PER_MONTH = 30;

export function expectedReturn(capital: number, monthlyRate: number, days: number): number {
  return capital * monthlyRate * (days / DAYS_PER_MONTH);
}

export function expectedTotal(capital: number, monthlyRate: number, days: number): number {
  return capital + expectedReturn(capital, monthlyRate, days);
}

export function dailyRateFromMonthly(monthlyRate: number): number {
  return monthlyRate / DAYS_PER_MONTH;
}

/** Tasa mensual implícita a partir de capital, total devuelto y días. */
export function impliedMonthlyRate(capital: number, totalReturned: number, days: number): number {
  if (capital <= 0 || days <= 0) return 0;
  const ret = totalReturned - capital;
  return (ret / capital) * (DAYS_PER_MONTH / days);
}

export function proRataReturn(capital: number, monthlyRate: number, daysElapsed: number): number {
  return capital * monthlyRate * (daysElapsed / DAYS_PER_MONTH);
}

export interface ReturnDeviation {
  absolute: number;
  percent: number;
}

export function returnDeviation(expected: number, actual: number): ReturnDeviation {
  const absolute = actual - expected;
  const percent = expected === 0 ? 0 : absolute / expected;
  return { absolute, percent };
}

export function weightedAverageRate(items: Array<{ amount: number; rate: number }>): number {
  const total = items.reduce((s, i) => s + i.amount, 0);
  if (total === 0) return 0;
  return items.reduce((s, i) => s + i.amount * i.rate, 0) / total;
}

/** Rendimiento de un cheque comprado: VN - precio pagado. */
export function checkReturn(paid: number, faceValue: number): number {
  return faceValue - paid;
}

/** Spread implícito en una compraventa de moneda. */
export function fxSpread(buyRate: number, sellRate: number): number {
  return sellRate - buyRate;
}
