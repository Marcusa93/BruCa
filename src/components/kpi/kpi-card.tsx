import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  delta?: { value: string; positive: boolean };
  accent?: "neutral" | "brand" | "success" | "warning" | "danger";
  sparkline?: number[];
  icon?: React.ReactNode;
}

export function KpiCard({ label, value, hint, delta, accent = "neutral", sparkline, icon }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-card transition-all hover:border-border-strong hover:shadow-elevated">
      {accent === "brand" && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-70" />
      )}

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            {label}
          </span>
        </div>
        {icon && <div className="text-ink-4">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-2xl font-semibold tracking-tight text-ink">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "tabular flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
              delta.positive
                ? "bg-success-bg text-success"
                : "bg-danger-bg text-danger",
            )}
          >
            {delta.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta.value}
          </span>
        )}
      </div>

      {hint && <div className="mt-1 text-xs text-ink-3">{hint}</div>}

      {sparkline && sparkline.length > 1 && (
        <Sparkline values={sparkline} positive={delta?.positive ?? true} className="mt-4 h-10" />
      )}
    </div>
  );
}

function Sparkline({ values, positive, className }: { values: number[]; positive: boolean; className?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = positive ? "var(--color-success)" : "var(--color-danger)";

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("w-full", className)}>
      <defs>
        <linearGradient id={`grad-${positive ? "p" : "n"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill={`url(#grad-${positive ? "p" : "n"})`}
        stroke="none"
        points={`0,100 ${points} 100,100`}
      />
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
