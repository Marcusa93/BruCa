"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X, AlertCircle, Loader2, Wrench, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrucaAIIcon } from "./bruca-ai-icon";
import { labelFor } from "@/lib/ai/labels";

interface ToolCall {
  id: string;
  name: string;
  args: unknown;
  result?: { ok: boolean; data?: unknown; error?: string; hint?: string };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  error?: string;
}

const SUGGESTED = [
  "¿Qué vence esta semana?",
  "¿Cuánto tengo colocado en pesos?",
  "Cargá una compra de cheque a Juan Pérez por $500.000 (VN $560.000) que vence el 30/06",
  "Simulá $1.000.000 al 4% durante 6 meses",
];

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cierra con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Autoscroll al final
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, busy]);

  async function send(text: string) {
    const userMsg: Message = { role: "user", content: text };
    const placeholder: Message = { role: "assistant", content: "", toolCalls: [] };
    const next = [...messages, userMsg, placeholder];
    setMessages(next);
    setInput("");
    setBusy(true);

    const aiIndex = next.length - 1;

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const ev of events) {
          if (!ev.trim()) continue;
          const lines = ev.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "))?.slice(7) ?? "message";
          const dataLine = lines.find((l) => l.startsWith("data: "))?.slice(6) ?? "{}";
          let payload: Record<string, unknown> = {};
          try {
            payload = JSON.parse(dataLine);
          } catch {}

          setMessages((prev) => {
            const copy = [...prev];
            const m = copy[aiIndex];
            if (!m) return prev;
            const updated: Message = { ...m, toolCalls: [...(m.toolCalls ?? [])] };

            if (eventLine === "tool_call") {
              updated.toolCalls!.push({
                id: payload.id as string,
                name: payload.name as string,
                args: payload.args,
              });
            } else if (eventLine === "tool_result") {
              const tc = updated.toolCalls!.find((t) => t.id === payload.id);
              if (tc) tc.result = payload.result as ToolCall["result"];
            } else if (eventLine === "text") {
              updated.content = payload.content as string;
            } else if (eventLine === "error") {
              updated.error = payload.message as string;
            }

            copy[aiIndex] = updated;
            return copy;
          });
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[aiIndex] = { ...copy[aiIndex], error: (e as Error).message };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Backdrop en mobile */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm sm:hidden"
        />
      )}

      {/* Floating button (FAB) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir BruCa IA"
        aria-expanded={open}
        className={cn(
          "group fixed z-50 flex items-center justify-center rounded-full text-white",
          "bottom-4 right-4 h-14 w-14 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16",
          "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800",
          "shadow-pop ring-2 ring-brand-100/50 ring-offset-2 ring-offset-canvas",
          "transition-all duration-300 ease-out hover:scale-105 active:scale-95",
          open && "rotate-90 scale-90",
        )}
      >
        {/* Halo que pulsa cuando está cerrado */}
        {!open && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-500/40" />
        )}
        {open ? (
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        ) : (
          <BrucaAIIcon size={28} className="transition-transform group-hover:scale-110 sm:hidden" />
        )}
        {!open && (
          <BrucaAIIcon
            size={32}
            className="hidden transition-transform group-hover:scale-110 sm:block"
          />
        )}
      </button>

      {/* Panel */}
      <div
        role="dialog"
        aria-label="BruCa IA"
        className={cn(
          "fixed z-40 origin-bottom-right transition-all duration-200 ease-out",
          // Mobile: full-width bottom drawer
          "inset-x-3 bottom-24 sm:inset-x-auto",
          // Desktop: anchored to FAB
          "sm:bottom-28 sm:right-6 sm:w-[420px]",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="flex max-h-[min(72vh,640px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-pop">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-brand-50 via-surface to-surface px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
              <BrucaAIIcon size={20} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-ink">Cafe+IA</span>
              <span className="flex items-center gap-1.5 text-[10px] text-ink-3">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                Especialista financiero · consultá y cargá operaciones
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              messages.map((m, i) => <Bubble key={i} message={m} />)
            )}
            {busy && messages[messages.length - 1]?.role === "assistant" && (
              <div className="flex items-center gap-2 text-[11px] text-ink-3">
                <Loader2 className="h-3 w-3 animate-spin" />
                Pensando…
              </div>
            )}
          </div>

          {/* Input */}
          <form
            className="border-t border-border bg-surface-2 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!input.trim() || busy) return;
              send(input.trim());
            }}
          >
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand-600" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Preguntá lo que necesites…"
                disabled={busy}
                className="flex-1 bg-transparent py-1 text-sm text-ink placeholder:text-ink-4 outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Enviar"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white transition-all hover:bg-brand-700 disabled:opacity-40"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 shadow-card">
        <BrucaAIIcon size={24} />
      </div>
      <div>
        <div className="text-sm font-semibold text-ink">Hola, soy Cafe+IA ☕</div>
        <div className="mx-auto mt-0.5 max-w-[280px] text-[11px] leading-relaxed text-ink-3">
          Te ayudo a consultar y cargar operaciones financieras de BruCa. Hablame en lenguaje natural — entiendo cheques, USD, USDT, inversiones y rendimientos.
        </div>
      </div>
      <div className="mt-1 grid w-full grid-cols-1 gap-1.5">
        {SUGGESTED.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-left text-[11px] text-ink-2 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-ink text-white"
            : "bg-gradient-to-br from-brand-500 to-brand-700 text-white",
        )}
      >
        {isUser ? (
          <span className="text-[10px] font-semibold">YO</span>
        ) : (
          <BrucaAIIcon size={14} />
        )}
      </div>
      <div className={cn("flex max-w-[85%] flex-col gap-1.5", isUser && "items-end")}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc) => (
              <ToolChip key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        {message.content && (
          <div
            className={cn(
              "rounded-xl px-3 py-2 text-[13px] leading-relaxed",
              isUser
                ? "bg-ink text-white"
                : "border border-border bg-surface-2 text-ink",
            )}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}
        {message.error && (
          <div className="flex items-start gap-1.5 rounded-md border border-danger/30 bg-danger-bg px-2.5 py-1.5 text-[11px] text-danger">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{message.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolChip({ toolCall }: { toolCall: ToolCall }) {
  const status = !toolCall.result
    ? "running"
    : toolCall.result.ok
      ? "ok"
      : "empty";
  const label = labelFor(toolCall.name, status);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        status === "running" && "border-info/30 bg-info-bg text-info",
        status === "ok" && "border-success/30 bg-success-bg text-success",
        status === "empty" && "border-warning/30 bg-warning-bg text-warning",
      )}
    >
      {status === "running" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Wrench className="h-3 w-3" />
      )}
      <span>{label}</span>
    </div>
  );
}
