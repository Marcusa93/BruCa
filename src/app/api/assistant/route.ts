import { NextRequest } from "next/server";
import { TOOLS, type ToolName } from "@/lib/ai/tools";
import { runTool } from "@/lib/ai/handlers";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface OAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
const MAX_TOOL_ROUNDS = 4;

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY no configurada" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as { messages: IncomingMessage[] };
  const userMessages = (body.messages ?? []).filter((m) => m.role !== "system");

  const conversation: OAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const lastUserMessage = [...userMessages].reverse().find((m) => m.role === "user")?.content ?? "";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const toolCallsLog: Array<{ name: string; args: unknown; result: unknown }> = [];
      let assistantText = "";

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const res = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://bruca.app",
              "X-Title": "BruCa Treasury",
            },
            body: JSON.stringify({
              model: MODEL,
              messages: conversation,
              tools: TOOLS,
              tool_choice: "auto",
              temperature: 0.2,
              stream: false,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            send("error", { message: `OpenRouter ${res.status}: ${errText.slice(0, 400)}` });
            controller.close();
            return;
          }

          const json = await res.json();
          const choice = json.choices?.[0];
          const message = choice?.message;
          if (!message) {
            send("error", { message: "Respuesta vacía del modelo" });
            controller.close();
            return;
          }

          // Caso 1: el modelo pidió tools
          if (message.tool_calls && message.tool_calls.length > 0) {
            conversation.push({
              role: "assistant",
              content: message.content ?? null,
              tool_calls: message.tool_calls,
            });

            for (const tc of message.tool_calls) {
              const name = tc.function.name as ToolName;
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(tc.function.arguments || "{}");
              } catch {
                args = {};
              }

              send("tool_call", { id: tc.id, name, args });

              const result = await runTool(name, args);
              toolCallsLog.push({ name, args, result });

              send("tool_result", { id: tc.id, name, result });

              conversation.push({
                role: "tool",
                tool_call_id: tc.id,
                name,
                content: JSON.stringify(result),
              });
            }
            continue; // siguiente vuelta para que el modelo concluya
          }

          // Caso 2: respuesta final
          assistantText = message.content ?? "";
          send("text", { content: assistantText });
          break;
        }

        // log a Supabase (best-effort, no rompe la respuesta si falla)
        try {
          const sb = createAdminClient();
          await sb.from("assistant_logs").insert({
            prompt: lastUserMessage,
            response: assistantText,
            tool_calls: toolCallsLog,
          });
        } catch {
          /* ignorar — la tabla puede no existir aún */
        }

        send("done", {});
      } catch (err) {
        send("error", { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
