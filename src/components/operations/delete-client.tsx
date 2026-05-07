"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteOperationAction } from "@/lib/actions/operations";

export function DeleteClient({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        variant="danger"
        size="sm"
        type="button"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar operación
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
      <AlertTriangle className="h-4 w-4" />
      <span>¿Confirmás eliminar esta operación? No se puede deshacer.</span>
      <Button
        variant="danger"
        size="sm"
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await deleteOperationAction(id);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin" />}
        Sí, eliminar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancelar
      </Button>
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}
