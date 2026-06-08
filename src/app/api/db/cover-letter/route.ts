import { NextResponse } from "next/server";
import {
  saveCoverLetter,
  removeCoverLetter,
  type CoverLetterPayload,
} from "@/lib/supabase/queries";
import { resolveRequestUserId } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const userId = await resolveRequestUserId(String(body.userId ?? ""));
  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }

  try {
    if (body.remove) {
      await removeCoverLetter(userId, String(body.id));
    } else {
      await saveCoverLetter(userId, body as unknown as CoverLetterPayload);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка БД" },
      { status: 500 },
    );
  }
}
