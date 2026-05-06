import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
  {
    variants: {
      tone: {
        neutral:
          "border-border bg-surface-2 text-ink-2",
        success:
          "border-success/20 bg-success-bg text-success",
        warning:
          "border-warning/20 bg-warning-bg text-warning",
        danger:
          "border-danger/20 bg-danger-bg text-danger",
        info:
          "border-info/20 bg-info-bg text-info",
        brand:
          "border-brand-600/20 bg-brand-50 text-brand-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ className, tone, dot, children, ...props }) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props}>
    {dot && (
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger animate-pulse-dot",
          tone === "info" && "bg-info",
          tone === "brand" && "bg-brand-600",
          (!tone || tone === "neutral") && "bg-ink-3",
        )}
      />
    )}
    {children}
  </span>
);
