"use client";

import { useRef, useState } from "react";
import { Send, Sparkles, User, Wrench, AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  "¿Qué inversiones vencen esta semana?",
  "¿Cuánto tengo colocado en pesos?",
  "¿Qué cliente tiene más capital aportado?",
  "¿Qué operaciones están en mora?",
  "Simulá $1.000.000 al 4% durante 6 meses con reinversión",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="flex flex-col lg:col-span-2">
        <div
          ref={scrollRef}
          className="flex h-[520px] flex-col gap-4 overflow-y-auto p-5"
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((m, i) => <MessageBubble key={i} message={m} />)
          )}
          {busy && messages[messages.length - 1]?.role === "assistant" && (
            <div className="flex items-center gap-2 text-xs text-ink-3">
              <Loader2 className="h-3 w-3 animate-spin" />
              Pensando…
            </div>
          )}
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || busy) return;
            send(input.trim());
          }}
        >
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 transition-colors focus-within:border-brand-400 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-100">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntá sobre vencimientos, capital, rendimiento, simulaciones…"
              disabled={busy}
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-4 outline-none"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || busy}
              aria-label="Enviar"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardContent className="space-y-2 py-4">
          <div className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">
            Preguntas sugeridas
          </div>
          {SUGGESTED.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => send(q)}
              className="block w-full rounded-md border border-border bg-surface p-2.5 text-left text-xs text-ink-2 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium text-ink">
        Asistente financiero de BruCa
      </div>
      <div className="max-w-sm text-xs text-ink-3">
        Respondo con datos reales obtenidos vía consultas tipadas. Si no tengo datos suficientes te lo digo — no invento.
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-ink text-white"
            : "bg-brand-50 text-brand-700",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc) => (
              <ToolCallChip key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        {message.content && (
          <div
            className={cn(
              "rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-ink text-white"
                : "border border-border bg-surface text-ink",
            )}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}
        {message.error && (
          <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{message.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallChip({ toolCall }: { toolCall: ToolCall }) {
  const [open, setOpen] = useState(false);
  const status = !toolCall.result
    ? "running"
    : toolCall.result.ok
      ? "ok"
      : "no_data";

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="block w-full rounded-md border border-border bg-surface-2 text-left transition-colors hover:bg-surface-3"
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Wrench className="h-3 w-3 text-ink-3" />
        <code className="font-mono text-[11px] text-ink-2">{toolCall.name}</code>
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            status === "running" && "bg-info-bg text-info",
            status === "ok" && "bg-success-bg text-success",
            status === "no_data" && "bg-warning-bg text-warning",
          )}
        >
          {status === "running" ? "consultando…" : status === "ok" ? "OK" : "sin datos"}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-ink-4 transition-transform",
            open && "rotate-180",
          )}
        />
      </div>
      {open && (
        <pre className="border-t border-border bg-surface p-2.5 font-mono text-[10px] leading-relaxed text-ink-2">
          {JSON.stringify({ args: toolCall.args, result: toolCall.result }, null, 2)}
        </pre>
      )}
    </button>
  );
}
