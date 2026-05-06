import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
