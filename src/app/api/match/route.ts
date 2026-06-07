import { NextResponse } from "next/server";
import { chatCompletion, extractJson, OpenRouterError } from "@/lib/ai/openrouter";
import { buildMatchMessages, type MatchVacancyInput } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RawMatch {
  id?: string;
  score?: unknown;
  strengths?: unknown;
  gaps?: unknown;
  summary?: unknown;
}

const clampScore = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((s) => String(s)).filter(Boolean).slice(0, 4) : [];

export async function POST(req: Request) {
  let resumeContext = "";
  let vacancies: MatchVacancyInput[] = [];
  try {
    const body = await req.json();
    resumeContext = String(body?.resumeContext ?? "").trim();
    vacancies = Array.isArray(body?.vacancies) ? body.vacancies : [];
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (!resumeContext || vacancies.length === 0) {
    return NextResponse.json({ error: "Нет данных для оценки" }, { status: 400 });
  }

  // Keep batches small for reliable JSON + token budget.
  const batch = vacancies.slice(0, 10);

  try {
    const raw = await chatCompletion({
      messages: buildMatchMessages(resumeContext, batch),
      temperature: 0.1,
      maxTokens: 1200,
    });

    const parsed = extractJson<RawMatch[]>(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    const byId = new Map<string, RawMatch>();
    for (const m of arr) {
      if (m?.id != null) byId.set(String(m.id), m);
    }

    // Return one result per requested vacancy, in the same order.
    const results = batch.map((v) => {
      const m = byId.get(v.id);
      return {
        id: v.id,
        score: m ? clampScore(m.score) : 0,
        strengths: m ? strList(m.strengths) : [],
        gaps: m ? strList(m.gaps) : [],
        summary: m?.summary ? String(m.summary).slice(0, 240) : "",
        ok: Boolean(m),
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    const status = err instanceof OpenRouterError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка оценки соответствия";
    return NextResponse.json({ error: message }, { status });
  }
}
