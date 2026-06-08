import { NextResponse } from "next/server";
import { loadState } from "@/lib/supabase/queries";
import { resolveRequestUserId } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const requestedUserId = new URL(req.url).searchParams.get("userId") ?? "";
  const userId = await resolveRequestUserId(requestedUserId);
  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }
  try {
    const state = await loadState(userId);
    return NextResponse.json(state);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка БД" },
      { status: 500 },
    );
  }
}
