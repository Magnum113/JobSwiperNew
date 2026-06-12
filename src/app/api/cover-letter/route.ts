import { NextResponse } from "next/server";
import { chatCompletion, AIError } from "@/lib/ai/client";
import { buildCoverLetterMessages } from "@/lib/ai/prompts";
import { getVacancy } from "@/lib/hh/client";
import { stripHtml } from "@/lib/hh/format";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

interface VacancyInput {
  id?: string;
  name?: string;
  company?: string;
  description?: string;
}

export async function POST(req: Request) {
  // Letter generation is an authenticated, paid action. Reject anonymous calls
  // so the endpoint can't be hit directly to burn the AI budget. Legitimate
  // app requests carry the session cookie, so this is resolved server-side.
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let resumeContext = "";
  let vacancy: VacancyInput = {};
  try {
    const body = await req.json();
    resumeContext = String(body?.resumeContext ?? "").trim();
    vacancy = body?.vacancy ?? {};
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (!resumeContext) {
    return NextResponse.json(
      { error: "Сначала добавьте резюме в личном кабинете" },
      { status: 400 },
    );
  }

  // Enrich with the full HH description if we only have a list-level vacancy.
  let description = String(vacancy.description ?? "");
  if (!description && vacancy.id) {
    try {
      const detail = await getVacancy(vacancy.id);
      description = stripHtml(detail.description);
    } catch {
      // Fall back to whatever we have; letter can still be generated.
    }
  }

  try {
    const text = await chatCompletion({
      messages: buildCoverLetterMessages(resumeContext, {
        name: String(vacancy.name ?? "вакансию"),
        company: String(vacancy.company ?? ""),
        description: description || "Описание недоступно.",
      }),
      temperature: 0.7,
      maxTokens: 900,
    });

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    const status = err instanceof AIError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка генерации письма";
    return NextResponse.json({ error: message }, { status });
  }
}
