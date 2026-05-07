import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubBody {
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  platform?: string;
  user_agent?: string;
  replaces_endpoint?: string | null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = (await req.json()) as SubBody;
  const sub = body.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  // Si se reemplaza un endpoint anterior (rotación), lo borramos
  if (body.replaces_endpoint && body.replaces_endpoint !== sub.endpoint) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", body.replaces_endpoint);
  }

  // Upsert: si el endpoint ya existe, actualizamos las keys + last_used_at
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh_key: sub.keys.p256dh,
        auth_key: sub.keys.auth,
        platform: body.platform ?? null,
        user_agent: body.user_agent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
