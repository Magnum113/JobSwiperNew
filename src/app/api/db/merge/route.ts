import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { mergeUsers } from "@/lib/supabase/queries";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const sourceUserId = String(body.sourceUserId ?? "");
  const targetUserId = await getAuthenticatedUserId();
  if (!targetUserId) {
    return NextResponse.json(
      { error: "Требуется авторизация" },
      { status: 401 },
    );
  }
  if (!sourceUserId) {
    return NextResponse.json(
      { error: "sourceUserId обязателен" },
      { status: 400 },
    );
  }

  try {
    await mergeUsers(sourceUserId, targetUserId);
    return NextResponse.json({ ok: true, userId: targetUserId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка БД" },
      { status: 500 },
    );
  }
}
