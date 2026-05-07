"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  Smartphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePush } from "@/hooks/use-push";

export function PushToggle() {
  const push = usePush();
  const [tipOpen, setTipOpen] = useState(false);

  // No soportado en absoluto → ocultar
  if (!push.isSupported && !push.loading) {
    // Excepción: iOS Safari sin standalone — sí mostramos un hint
    if (!push.isIOSWithoutStandalone) return null;
  }

  // iOS sin PWA instalada → mostrar hint
  if (push.isIOSWithoutStandalone) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setTipOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning-bg"
          aria-label="Cómo activar notificaciones en iOS"
        >
          <Smartphone className="h-4 w-4" />
        </button>
        {tipOpen && (
          <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border border-border bg-surface p-3 text-xs shadow-pop">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="font-semibold text-ink">Activar en iPhone</span>
              <button
                type="button"
                onClick={() => setTipOpen(false)}
                className="text-ink-3 hover:text-ink"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-ink-3">
              Para recibir notificaciones en iPhone, primero instalá la app:
            </p>
            <ol className="mt-2 list-decimal pl-4 leading-relaxed text-ink-2">
              <li>Tocá compartir en Safari</li>
              <li>&ldquo;Agregar a pantalla de inicio&rdquo;</li>
              <li>Abrí BruCa desde el ícono</li>
              <li>Volvé a tocar este botón</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  const subscribed = push.isSubscribed && push.permission === "granted";
  const denied = push.permission === "denied";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={push.loading}
        onClick={() => {
          if (denied) {
            setTipOpen((v) => !v);
            return;
          }
          if (subscribed) push.unsubscribe();
          else push.subscribe();
        }}
        className={cn(
          "relative flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all",
          subscribed
            ? "border-success/30 bg-success-bg text-success hover:border-success/50"
            : denied
              ? "border-warning/30 bg-warning-bg text-warning hover:border-warning/50"
              : "border-border bg-surface-2 text-ink-2 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800",
        )}
        aria-label={
          subscribed
            ? "Notificaciones activas — click para desactivar"
            : "Activar notificaciones"
        }
      >
        {push.loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : subscribed ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notifs activas</span>
          </>
        ) : denied ? (
          <>
            <BellOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bloqueadas</span>
          </>
        ) : (
          <>
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Activar notifs</span>
          </>
        )}
      </button>

      {push.error && (
        <div className="absolute right-0 top-11 z-50 flex w-72 items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg p-3 text-xs text-danger shadow-pop">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{push.error}</span>
          <button
            type="button"
            onClick={push.clearError}
            className="text-danger hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {denied && tipOpen && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border border-border bg-surface p-3 text-xs shadow-pop">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-ink">Notificaciones bloqueadas</span>
            <button
              type="button"
              onClick={() => setTipOpen(false)}
              className="text-ink-3 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-ink-3">
            Tu navegador bloqueó las notificaciones. Cambialo en la configuración del
            sitio (ícono de candado en la barra de URL → Notificaciones → Permitir).
          </p>
        </div>
      )}
    </div>
  );
}
