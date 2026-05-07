/**
 * Helper server-side para enviar notificaciones push.
 * Usa la VAPID privada y la lib `web-push`.
 */
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@bruca.com";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys no configuradas en el servidor.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type PushKind =
  | "maturity_tomorrow"
  | "maturity_today_unmarked"
  | "commitment_due_soon"
  | "possible_default"
  | "investment_created"
  | "operation_created"
  | "operation_collected"
  | "operation_in_default"
  | "investor_created"
  | "ai_action"
  | "deviation_alert"
  | "manual";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  meta?: Record<string, unknown>;
  kind?: PushKind;
}

export interface PushResult {
  sent: number;
  failed: number;
  removed: number;
  errors: string[];
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

/**
 * Envía un push a un usuario específico (todas sus subs) o a todos los usuarios
 * (cuando user_id es null/undefined — útil para alertas globales).
 */
export async function sendPush(opts: {
  userId?: string | null;
  payload: PushPayload;
}): Promise<PushResult> {
  ensureVapidConfigured();
  const sb = createAdminClient();

  let q = sb
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh_key, auth_key");
  if (opts.userId) q = q.eq("user_id", opts.userId);

  const { data, error } = await q;
  if (error) throw error;
  const subs = ((data ?? []) as unknown) as SubscriptionRow[];

  const result: PushResult = { sent: 0, failed: 0, removed: 0, errors: [] };
  if (subs.length === 0) return result;

  const body = JSON.stringify(opts.payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          body,
          { TTL: 86400 }, // 24hs
        );
        result.sent++;
        // Touch last_used_at
        await sb
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // suscripción caducada → borrar
          await sb.from("push_subscriptions").delete().eq("id", sub.id);
          result.removed++;
        } else {
          result.failed++;
          result.errors.push(`${sub.endpoint.slice(-40)}: ${(e as Error).message}`);
        }
      }
    }),
  );

  return result;
}

/**
 * Envía a todos los usuarios autenticados con suscripciones activas
 * (alertas operativas globales para los dueños de BruCa).
 */
export async function sendPushToAll(payload: PushPayload): Promise<PushResult> {
  return sendPush({ userId: null, payload });
}
