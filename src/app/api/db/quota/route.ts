import { NextResponse } from "next/server";
import { saveQuota } from "@/lib/supabase/queries";
import { resolveRequestUserId } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  let body: {
    userId?: string;
    quota?: {
      responsesUsed?: number;
      analysesUsed?: number;
      resumesUsed?: number;
    };
    bonusClaimed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const userId = await resolveRequestUserId(body.userId ?? "");
  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }

  try {
    await saveQuota(
      userId,
      {
        responsesUsed: Number(body.quota?.responsesUsed) || 0,
        analysesUsed: Number(body.quota?.analysesUsed) || 0,
        resumesUsed: Number(body.quota?.resumesUsed) || 0,
      },
      Boolean(body.bonusClaimed),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка БД" },
      { status: 500 },
    );
  }
}
