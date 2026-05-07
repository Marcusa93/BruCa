"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Check,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtDate, type Currency } from "@/lib/finance/formatters";
import { kindLabel } from "@/lib/finance/labels";
import { setOperationStatusAction } from "@/lib/actions/operations";
import { cn } from "@/lib/utils";

export interface BucketItem {
  id: string;
  kind: string;
  counterparty: string | null;
  currency: Currency;
  amount: number;
  expected_total: number | null;
  due_date: string;
  status: string;
}

export function MaturityBucket({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "neutral" | "info" | "warning" | "danger" | "success";
  items: BucketItem[];
}) {
  const total = items.reduce(
    (s, i) => s + Number(i.expected_total ?? i.amount),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{title}</span>
          <Badge tone={tone}>{items.length}</Badge>
        </CardTitle>
        {total > 0 && (
          <span className="tabular text-[11px] font-medium text-ink-3">
            {fmtMoney(total, "ARS")}
          </span>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {items.length === 0 ? (
          <div className="flex h-20 items-center justify-center text-xs text-ink-4">
            —
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ item }: { item: BucketItem }) {
  const [pending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  function action(
    label: string,
    newStatus: "collected" | "in_default" | "reinvested" | "cancelled",
    actualReturn?: number,
  ) {
    setActiveAction(label);
    startTransition(async () => {
      await setOperationStatusAction(item.id, newStatus, actualReturn);
      setActiveAction(null);
    });
  }

  const expected = Number(item.expected_total ?? item.amount);

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2">
      <div className="col-span-12 sm:col-span-4">
        <Link
          href={`/colocaciones/${item.id}`}
          className="block text-sm font-semibold text-ink hover:text-brand-700"
        >
          {item.counterparty ?? "—"}
        </Link>
        <div className="text-xs text-ink-3">
          {kindLabel(item.kind)}
        </div>
      </div>
      <div className="tabular col-span-6 text-sm font-semibold text-ink sm:col-span-3">
        {fmtMoney(expected, item.currency)}
      </div>
      <div className="col-span-6 text-right text-xs text-ink-3 sm:col-span-2 sm:text-left">
        {fmtDate(item.due_date)}
      </div>
      <div className="col-span-12 flex flex-wrap justify-end gap-1.5 sm:col-span-3">
        <Link
          href={`/colocaciones/${item.id}`}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-2 px-2 text-[11px] font-medium text-ink-3 transition-colors hover:bg-surface-3 hover:text-brand-700"
          aria-label="Ver detalle"
        >
          <Eye className="h-3 w-3" />
          <span className="hidden sm:inline">Detalle</span>
        </Link>
        <ActionButton
          label="Cobrada"
          tone="success"
          icon={<Check className="h-3 w-3" />}
          onClick={() => action("collected", "collected", expected - Number(item.amount))}
          disabled={pending}
          loading={activeAction === "collected"}
        />
        <ActionButton
          label="En mora"
          tone="danger"
          icon={<AlertTriangle className="h-3 w-3" />}
          onClick={() => action("in_default", "in_default")}
          disabled={pending}
          loading={activeAction === "in_default"}
        />
        <ActionButton
          label="Reinvertida"
          tone="info"
          icon={<RefreshCw className="h-3 w-3" />}
          onClick={() => action("reinvested", "reinvested")}
          disabled={pending}
          loading={activeAction === "reinvested"}
        />
        <ActionButton
          label="Cancelar"
          tone="neutral"
          icon={<X className="h-3 w-3" />}
          onClick={() => action("cancelled", "cancelled")}
          disabled={pending}
          loading={activeAction === "cancelled"}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  icon,
  onClick,
  disabled,
  loading,
}: {
  label: string;
  tone: "success" | "danger" | "info" | "neutral";
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors disabled:opacity-40",
        tone === "success" &&
          "border-success/30 bg-success-bg text-success hover:border-success/50",
        tone === "danger" &&
          "border-danger/30 bg-danger-bg text-danger hover:border-danger/50",
        tone === "info" &&
          "border-info/30 bg-info-bg text-info hover:border-info/50",
        tone === "neutral" &&
          "border-border bg-surface-2 text-ink-3 hover:bg-surface-3",
      )}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

