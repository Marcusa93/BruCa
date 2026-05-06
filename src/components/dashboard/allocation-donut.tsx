"use client";

import { fmtMoney, fmtPercent } from "@/lib/finance/formatters";

interface Slice {
  label: string;
  amount: number;
  color: string;
}

export function AllocationDonut({ slices, total, currency = "ARS" }: { slices: Slice[]; total: number; currency?: "ARS" | "USD" }) {
  const C = 2 * Math.PI * 70;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r="70" fill="none" stroke="var(--color-border)" strokeWidth="22" />
          {slices.map((s) => {
            const pct = total === 0 ? 0 : s.amount / total;
            const len = pct * C;
            const dasharray = `${len} ${C - len}`;
            const el = (
              <circle
                key={s.label}
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke={s.color}
                strokeWidth="22"
                strokeDasharray={dasharray}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-4">Total</span>
          <span className="tabular mt-0.5 text-lg font-semibold text-ink">
            {fmtMoney(total, currency)}
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {slices.map((s) => {
          const pct = total === 0 ? 0 : s.amount / total;
          return (
            <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-ink-2">{s.label}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="tabular text-xs text-ink-4">{fmtPercent(pct)}</span>
                <span className="tabular w-28 font-medium text-ink">
                  {fmtMoney(s.amount, currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
