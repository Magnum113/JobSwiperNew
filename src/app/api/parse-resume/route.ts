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
const VALID_SENIORITY = ["Стажёр", "Junior", "Middle", "Senior", "Lead"];

interface ParsedResume {
  title?: string;
  skills?: unknown;
  seniority?: string;
  summary?: string;
  experienceId?: string;
}

function cleanText(value: unknown, max: number): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;

  const sliced = text.slice(0, max + 1);
  const lastBoundary = Math.max(
    sliced.lastIndexOf("."),
    sliced.lastIndexOf("!"),
    sliced.lastIndexOf("?"),
    sliced.lastIndexOf(";"),
    sliced.lastIndexOf(","),
    sliced.lastIndexOf(" "),
  );
  const clean = sliced.slice(0, lastBoundary > max * 0.6 ? lastBoundary : max);
  return clean.replace(/[,\s;:.!?]+$/, "").trim() + "…";
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
    const seniority = VALID_SENIORITY.includes(String(parsed.seniority))
      ? String(parsed.seniority)
      : "";

    return NextResponse.json({
      title: cleanText(parsed.title, 80),
      skills: skills.map((skill) => cleanText(skill, 80)).filter(Boolean),
      seniority,
      summary: cleanText(parsed.summary, 200),
      experienceId,
    });
  } catch (err) {
    const status = err instanceof AIError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка анализа резюме";
    return NextResponse.json({ error: message }, { status });
  }
}
