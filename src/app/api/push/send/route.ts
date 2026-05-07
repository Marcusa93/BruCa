import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const userId = body.user_id ?? user.id;
  const result = await sendPush({
    userId,
    payload: {
      title: body.title ?? "BruCa",
      body: body.body ?? "",
      url: body.url ?? "/dashboard",
      icon: body.icon,
      kind: "manual",
    },
  });
  return NextResponse.json(result);
}
