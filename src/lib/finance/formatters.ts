export type Currency = "ARS" | "USD" | "EUR" | "BRL";

const moneyFormatters: Record<Currency, Intl.NumberFormat> = {
  ARS: new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }),
  EUR: new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }),
  BRL: new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }),
};

export function fmtMoney(amount: number, currency: Currency = "ARS"): string {
  return moneyFormatters[currency].format(amount);
}

export function fmtCompact(amount: number, currency: Currency = "ARS"): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} mM ${currency === "ARS" ? "$" : currency}`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)} M ${currency === "ARS" ? "$" : currency}`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1)} k ${currency === "ARS" ? "$" : currency}`;
  return fmtMoney(amount, currency);
}

const percentFormatter = new Intl.NumberFormat("es-AR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtPercent(decimal: number): string {
  return percentFormatter.format(decimal);
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateLongFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function fmtDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateFormatter.format(d);
}

export function fmtDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateLongFormatter.format(d);
}

export function fmtDays(days: number): string {
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  if (days > 0) return `en ${days} días`;
  return `hace ${Math.abs(days)} días`;
}

export const currencySymbol: Record<Currency, string> = {
  ARS: "$",
  USD: "US$",
  EUR: "€",
  BRL: "R$",
};
