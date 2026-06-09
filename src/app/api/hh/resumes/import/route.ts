import { NextResponse } from "next/server";
import { readAppSessionUser } from "@/lib/auth/app-session";
import { getValidHhUserToken, hhUserGet, HhUserAuthError } from "@/lib/hh/user-token";
import { mapHhResumeToProfile } from "@/lib/hh/resume-map";
import { saveProfile } from "@/lib/supabase/queries";
import type { HHResumeDetail } from "@/lib/hh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Imports a chosen hh.ru resume into the signed-in user's profile. */
export async function POST(req: Request) {
  const user = await readAppSessionUser();
  if (!user || user.provider !== "hh") {
    return NextResponse.json({ error: "Не авторизован через hh.ru" }, { status: 401 });
  }

  let resumeId = "";
  try {
    const body = await req.json();
    resumeId = String(body?.resumeId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  if (!resumeId) {
    return NextResponse.json({ error: "Не указан resumeId" }, { status: 400 });
  }

  try {
    const token = await getValidHhUserToken(user.id);
    const detail = await hhUserGet<HHResumeDetail>(
      token,
      `/resumes/${encodeURIComponent(resumeId)}`,
    );
    const profile = mapHhResumeToProfile(detail);
    await saveProfile(user.id, profile);
    return NextResponse.json(
      { profile },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const status = err instanceof HhUserAuthError ? 401 : 500;
    const message =
      err instanceof Error ? err.message : "Не удалось импортировать резюме";
    return NextResponse.json({ error: message }, { status });
  }
}
