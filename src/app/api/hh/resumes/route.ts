import { NextResponse } from "next/server";
import { readAppSessionUser } from "@/lib/auth/app-session";
import { getValidHhUserToken, hhUserGet, HhUserAuthError } from "@/lib/hh/user-token";
import { toResumeChoice } from "@/lib/hh/resume-map";
import { HH_API_BASE } from "@/lib/auth/hh";
import type { HHMeResponse, HHResumeListResponse } from "@/lib/hh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Lists the signed-in user's hh.ru resumes for the chooser UI. */
export async function GET() {
  const user = await readAppSessionUser();
  if (!user || user.provider !== "hh") {
    return NextResponse.json({ error: "Не авторизован через hh.ru" }, { status: 401 });
  }

  try {
    const token = await getValidHhUserToken(user.id);
    const me = await hhUserGet<HHMeResponse>(token, "/me");
    const resumesUrl = str(me.resumes_url) ?? `${HH_API_BASE}/resumes/mine`;
    const list = await hhUserGet<HHResumeListResponse>(token, resumesUrl);
    const resumes = (Array.isArray(list.items) ? list.items : []).map(toResumeChoice);
    return NextResponse.json(
      { resumes },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    const status = err instanceof HhUserAuthError ? 401 : 500;
    const message =
      err instanceof Error ? err.message : "Не удалось загрузить резюме с hh.ru";
    return NextResponse.json({ error: message }, { status });
  }
}
