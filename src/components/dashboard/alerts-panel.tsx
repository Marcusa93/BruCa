import { AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Alert {
  level: "warning" | "danger" | "info";
  title: string;
  detail: string;
}

const iconByLevel = {
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Clock,
};

const styleByLevel = {
  warning: "text-warning bg-warning-bg",
  danger: "text-danger bg-danger-bg",
  info: "text-info bg-info-bg",
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas operativas</CardTitle>
        <span className="text-[11px] font-medium text-ink-3">{alerts.length}</span>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a, i) => {
          const Icon = iconByLevel[a.level];
          return (
            <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3">
              <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", styleByLevel[a.level])}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{a.title}</div>
                <div className="text-xs text-ink-3">{a.detail}</div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
