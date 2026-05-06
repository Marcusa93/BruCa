import * as React from "react";
import { cn } from "@/lib/utils";

export const Separator: React.FC<React.HTMLAttributes<HTMLDivElement> & { vertical?: boolean }> = ({
  className,
  vertical,
  ...props
}) => (
  <div
    role="separator"
    className={cn(
      vertical ? "h-full w-px" : "h-px w-full",
      "bg-border",
      className,
    )}
    {...props}
  />
);
