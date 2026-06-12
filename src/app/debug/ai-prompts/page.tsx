import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileText, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getVacancy } from "@/lib/hh/client";
import { cleanSnippet, stripHtml } from "@/lib/hh/format";
import {
  buildCoverLetterMessages,
  buildMatchMessages,
  type MatchVacancyInput,
} from "@/lib/ai/prompts";
import { buildResumeContext } from "@/lib/resume";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import {
  loadState,
  loadVacancySnapshot,
} from "@/lib/supabase/queries";
import type { ChatMessage } from "@/lib/ai/client";
import type { HHVacancyItem } from "@/lib/hh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI prompt debug | JobSwiper",
  description: "Отладка prompt payload для AI-запросов JobSwiper.",
  robots: {
    index: false,
    follow: false,
  },
};

type PromptKind = "match" | "cover";

interface PageProps {
  searchParams: Promise<{
    kind?: string | string[];
    vacancyId?: string | string[];
  }>;
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function kindFrom(value: string): PromptKind {
  return value === "cover" ? "cover" : "match";
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function PreBlock({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-foreground/90">
        {value}
      </pre>
    </section>
  );
}

function Notice({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "warn";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground"
          : "rounded-xl border border-border/70 bg-card p-4 text-sm text-muted-foreground"
      }
    >
      {children}
    </div>
  );
}

async function loadVacancyForDebug(vacancyId: string): Promise<{
  vacancy: HHVacancyItem | null;
  source: "snapshot" | "hh-detail" | "missing";
  sourceNote: string;
}> {
  const snapshot = await loadVacancySnapshot(vacancyId);
  if (snapshot) {
    return {
      vacancy: snapshot,
      source: "snapshot",
      sourceNote:
        "Match prompt собран из сохранённого снапшота search-вакансии. Это тот же тип данных, который уходит в /api/match после оценки карточки.",
    };
  }

  try {
    const detail = await getVacancy(vacancyId);
    return {
      vacancy: detail,
      source: "hh-detail",
      sourceNote:
        "Снапшота search-вакансии в БД нет, поэтому match prompt собран fallback-ом из детальной вакансии hh.ru. Он может отличаться от реального /api/match, где используется короткий snippet из поиска.",
    };
  } catch {
    return {
      vacancy: null,
      source: "missing",
      sourceNote: "Вакансия не найдена ни в сохранённых снапшотах, ни в hh.ru.",
    };
  }
}

function matchInputFromVacancy(vacancy: HHVacancyItem): MatchVacancyInput {
  const searchSnippet = cleanSnippet(vacancy.snippet);
  const fallbackDescription = stripHtml(vacancyDescription(vacancy));

  return {
    id: vacancy.id,
    name: vacancy.name,
    company: vacancy.employer?.name ?? "",
    info: searchSnippet || fallbackDescription,
    experience: vacancy.experience?.name ?? "",
  };
}

function vacancyDescription(vacancy: HHVacancyItem): string {
  return "description" in vacancy && typeof vacancy.description === "string"
    ? vacancy.description
    : "";
}

function PromptSwitcher({
  kind,
  vacancyId,
}: {
  kind: PromptKind;
  vacancyId: string;
}) {
  const base = `/debug/ai-prompts?vacancyId=${encodeURIComponent(vacancyId)}`;
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-card p-1">
      <Link
        href={`${base}&kind=match`}
        className={buttonVariants({
          variant: kind === "match" ? "default" : "ghost",
          size: "sm",
        })}
        prefetch={false}
      >
        <Sparkles className="size-4" />
        Match
      </Link>
      <Link
        href={`${base}&kind=cover`}
        className={buttonVariants({
          variant: kind === "cover" ? "default" : "ghost",
          size: "sm",
        })}
        prefetch={false}
      >
        <FileText className="size-4" />
        Letter
      </Link>
    </div>
  );
}

export default async function AiPromptDebugPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const vacancyId = one(params.vacancyId).trim();
  const kind = kindFrom(one(params.kind));
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          prefetch={false}
        >
          <ArrowLeft className="size-4" />
          Вернуться в ленту
        </Link>
        <Notice tone="warn">
          Нужно войти в аккаунт, чтобы открыть prompt debug. Страница показывает
          текст вашего резюме и не доступна без текущей сессии.
        </Notice>
      </main>
    );
  }

  const state = await loadState(userId);
  const resumeContext = buildResumeContext(state.profile);

  if (!state.profile || !resumeContext) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          prefetch={false}
        >
          <ArrowLeft className="size-4" />
          Вернуться в ленту
        </Link>
        <Notice tone="warn">
          В профиле нет резюме. Prompt нельзя собрать без resumeContext.
        </Notice>
      </main>
    );
  }

  if (!vacancyId) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          prefetch={false}
        >
          <ArrowLeft className="size-4" />
          Вернуться в ленту
        </Link>
        <Notice tone="warn">
          Добавьте `vacancyId` в URL, например
          `/debug/ai-prompts?vacancyId=123&kind=match`.
        </Notice>
      </main>
    );
  }

  const { vacancy, source, sourceNote } = await loadVacancyForDebug(vacancyId);

  if (!vacancy) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          prefetch={false}
        >
          <ArrowLeft className="size-4" />
          Вернуться в ленту
        </Link>
        <Notice tone="warn">{sourceNote}</Notice>
      </main>
    );
  }

  const matchInput = matchInputFromVacancy(vacancy);
  const matchMessages = buildMatchMessages(resumeContext, [matchInput]);
  const detailForCover =
    kind === "cover"
      ? await getVacancy(vacancyId).catch(() => null)
      : source === "hh-detail"
        ? vacancy
        : null;
  const coverDescription = detailForCover
    ? vacancyDescription(detailForCover)
    : "";
  const coverMessages: ChatMessage[] = buildCoverLetterMessages(resumeContext, {
    name: detailForCover?.name ?? vacancy.name,
    company: detailForCover?.employer?.name ?? vacancy.employer?.name ?? "",
    description: coverDescription,
  });
  const messages = kind === "cover" ? coverMessages : matchMessages;
  const requestOptions =
    kind === "cover"
      ? { model: "AI_MODEL || mistral-nemo", temperature: 0.7, max_tokens: 700 }
      : { model: "AI_MODEL || mistral-nemo", temperature: 0.1, max_tokens: 1200 };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            prefetch={false}
          >
            <ArrowLeft className="size-4" />
            Вернуться в ленту
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">AI prompt debug</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vacancy.name} · {vacancy.employer?.name ?? "Компания не указана"}
          </p>
        </div>
        <PromptSwitcher kind={kind} vacancyId={vacancyId} />
      </div>

      <Notice tone={source === "snapshot" ? "muted" : "warn"}>
        <div className="flex gap-2">
          {source !== "snapshot" && <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
          <span>{sourceNote}</span>
        </div>
      </Notice>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PreBlock title="Chat messages" value={pretty(messages)} />
        <div className="flex flex-col gap-4">
          <PreBlock title="Request options" value={pretty(requestOptions)} />
          <PreBlock
            title={kind === "cover" ? "Cover vacancy input" : "Match vacancy input"}
            value={
              kind === "cover"
                ? pretty({
                    name: detailForCover?.name ?? vacancy.name,
                    company:
                      detailForCover?.employer?.name ??
                      vacancy.employer?.name ??
                      "",
                    descriptionLength: coverDescription.length,
                    descriptionPreview: stripHtml(coverDescription).slice(0, 1200),
                  })
                : pretty(matchInput)
            }
          />
          <PreBlock title="Resume context" value={resumeContext} />
        </div>
      </div>
    </main>
  );
}
