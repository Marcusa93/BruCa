"use client";

import { useState, useTransition } from "react";
import { Check, AlertTriangle, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setOperationStatusAction } from "@/lib/actions/operations";
import type { PlacementStatus } from "@/lib/finance/status";

export function OperationActions({
  id,
  status,
  expectedReturn,
  amount,
}: {
  id: string;
  status: PlacementStatus;
  expectedReturn: number | null;
  amount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);

  function action(
    label: string,
    newStatus: "collected" | "in_default" | "reinvested" | "cancelled",
    actualReturn?: number,
  ) {
    setActive(label);
    startTransition(async () => {
      await setOperationStatusAction(id, newStatus, actualReturn);
      setActive(null);
    });
  }

  // Si ya está cerrada, no mostramos acciones
  if (["collected", "reinvested", "cancelled"].includes(status)) {
    return null;
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() =>
          action("collected", "collected", expectedReturn ?? undefined)
        }
        disabled={pending}
      >
        {active === "collected" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Cobrada
      </Button>
      <Button
        variant="secondary"
        size="md"
        onClick={() => action("in_default", "in_default")}
        disabled={pending}
      >
        {active === "in_default" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        En mora
      </Button>
      <Button
        variant="secondary"
        size="md"
        onClick={() => action("reinvested", "reinvested")}
        disabled={pending}
      >
        {active === "reinvested" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Reinvertida
      </Button>
      <Button
        variant="ghost"
        size="md"
        onClick={() => action("cancelled", "cancelled")}
        disabled={pending}
      >
        {active === "cancelled" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
        Cancelar
      </Button>
      <span className="hidden">{amount}</span>
    </>
  );
}
