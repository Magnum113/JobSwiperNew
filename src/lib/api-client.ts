// Browser-side fetch wrappers around our own /api routes.
import type { HHSearchResponse, HHVacancyItem } from "./hh/types";
import type { Filters, MatchResult, ResumeProfile } from "./types";
import type { HhResumeChoice } from "./hh/resume-map";
import { cleanSnippet } from "./hh/format";

async function asError(res: Response): Promise<never> {
  let message = `Ошибка ${res.status}`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // ignore
  }
  throw new Error(message);
}

export function filtersToQuery(filters: Filters, page: number): string {
  const qs = new URLSearchParams();
  if (filters.text.trim()) qs.set("text", filters.text.trim());
  if (filters.area) qs.set("area", filters.area);
  if (filters.salary) qs.set("salary", String(filters.salary));
  if (filters.onlyWithSalary) qs.set("only_with_salary", "true");
  for (const e of filters.experience) qs.append("experience", e);
  for (const e of filters.employment) qs.append("employment", e);
  for (const s of filters.schedule) qs.append("schedule", s);
  if (filters.orderBy) qs.set("order_by", filters.orderBy);
  qs.set("per_page", "30");
  qs.set("page", String(page));
  return qs.toString();
}

export async function fetchVacancies(
  filters: Filters,
  page: number,
): Promise<HHSearchResponse> {
  const res = await fetch(`/api/vacancies?${filtersToQuery(filters, page)}`);
  if (!res.ok) await asError(res);
  return res.json();
}

export interface MatchApiResult extends MatchResult {
  id: string;
  ok: boolean;
}

export async function postMatch(
  resumeContext: string,
  vacancies: HHVacancyItem[],
): Promise<MatchApiResult[]> {
  const payload = vacancies.map((v) => ({
    id: v.id,
    name: v.name,
    company: v.employer?.name ?? "",
    info: cleanSnippet(v.snippet),
    experience: v.experience?.name ?? "",
  }));

  const res = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeContext, vacancies: payload }),
  });
  if (!res.ok) await asError(res);
  const data = await res.json();
  return data.results as MatchApiResult[];
}

export async function postCoverLetter(
  resumeContext: string,
  vacancy: HHVacancyItem,
): Promise<string> {
  const res = await fetch("/api/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeContext,
      vacancy: {
        id: vacancy.id,
        name: vacancy.name,
        company: vacancy.employer?.name ?? "",
      },
    }),
  });
  if (!res.ok) await asError(res);
  const data = await res.json();
  return data.text as string;
}

/** Cover letter for a manually pasted vacancy (description provided directly). */
export async function postCustomCoverLetter(
  resumeContext: string,
  vacancy: { name: string; company: string; description: string },
): Promise<string> {
  const res = await fetch("/api/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeContext, vacancy }),
  });
  if (!res.ok) await asError(res);
  const data = await res.json();
  return data.text as string;
}

export interface ParsedResumeResponse {
  title: string;
  skills: string[];
  seniority: string;
  summary: string;
  experienceId: string;
}

export async function postParseResume(
  resumeText: string,
): Promise<ParsedResumeResponse> {
  const res = await fetch("/api/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText }),
  });
  if (!res.ok) await asError(res);
  return res.json();
}

/** List the signed-in user's hh.ru resumes (for the chooser). */
export async function fetchHhResumes(): Promise<HhResumeChoice[]> {
  const res = await fetch("/api/hh/resumes", { cache: "no-store" });
  if (!res.ok) await asError(res);
  const data = await res.json();
  return (data.resumes ?? []) as HhResumeChoice[];
}

/** Import a chosen hh.ru resume into the profile. */
export async function importHhResume(resumeId: string): Promise<ResumeProfile> {
  const res = await fetch("/api/hh/resumes/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId }),
  });
  if (!res.ok) await asError(res);
  const data = await res.json();
  return data.profile as ResumeProfile;
}

/** Upload a PDF/DOCX resume and get back extracted plain text. */
export async function postExtractResume(
  file: File,
): Promise<{ text: string; name: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/extract-resume", {
    method: "POST",
    body: form,
  });
  if (!res.ok) await asError(res);
  return res.json();
}
