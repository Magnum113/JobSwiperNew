import { NextResponse } from "next/server";
import { chatCompletion, extractJson, AIError } from "@/lib/ai/client";
import { buildResumeParseMessages } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_EXP = [
  "noExperience",
  "between1And3",
  "between3And6",
  "moreThan6",
];

interface ParsedResume {
  title?: string;
  skills?: unknown;
  seniority?: string;
  summary?: string;
  experienceId?: string;
}

export async function POST(req: Request) {
  let resumeText = "";
  try {
    const body = await req.json();
    resumeText = String(body?.resumeText ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (resumeText.length < 30) {
    return NextResponse.json(
      { error: "Резюме слишком короткое для анализа" },
      { status: 400 },
    );
  }

  try {
    const raw = await chatCompletion({
      messages: buildResumeParseMessages(resumeText),
      temperature: 0.1,
      maxTokens: 500,
    });

    const parsed = extractJson<ParsedResume>(raw);
    if (!parsed) {
      return NextResponse.json(
        { error: "ИИ вернул нечитаемый ответ, попробуйте ещё раз" },
        { status: 502 },
      );
    }

    const skills = Array.isArray(parsed.skills)
      ? parsed.skills.map((s) => String(s)).filter(Boolean).slice(0, 15)
      : [];

    const experienceId = VALID_EXP.includes(String(parsed.experienceId))
      ? String(parsed.experienceId)
      : "between1And3";

    return NextResponse.json({
      title: String(parsed.title ?? "").trim().slice(0, 80),
      skills,
      seniority: String(parsed.seniority ?? "").trim().slice(0, 20),
      summary: String(parsed.summary ?? "").trim().slice(0, 240),
      experienceId,
    });
  } catch (err) {
    const status = err instanceof AIError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка анализа резюме";
    return NextResponse.json({ error: message }, { status });
  }
}
