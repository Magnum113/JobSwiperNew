import type { HHResumeDetail, HHResumeListItem } from "./types";
import type { ResumeProfile } from "@/lib/types";

// Maps an hh.ru resume into our ResumeProfile shape directly from structured
// fields — no AI call, so importing a resume costs no resume-parse quota.
// Mirrors the validation done in /api/parse-resume (experience whitelist, field
// length caps) so imported profiles are indistinguishable from analyzed ones.

const MAX_SKILLS = 15;
const TITLE_MAX = 80;
const SENIORITY_MAX = 20;
const SUMMARY_MAX = 240;

/** hh.ru `total_experience.months` → our experience filter id. */
export function experienceIdFromMonths(months: number | null | undefined): string {
  if (!months || months <= 0) return "noExperience";
  if (months < 36) return "between1And3";
  if (months <= 72) return "between3And6";
  return "moreThan6";
}

/** Rough seniority label derived from total months of experience. */
function seniorityFromMonths(months: number | null | undefined): string {
  if (!months || months <= 0) return "Junior";
  if (months < 36) return "Junior";
  if (months <= 72) return "Middle";
  return "Senior";
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function experienceLine(exp: {
  position?: string | null;
  company?: string | null;
  description?: string | null;
}): string {
  const head = [exp.position, exp.company].filter(Boolean).join(" — ").trim();
  const body = String(exp.description ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return [head, body].filter(Boolean).join(". ");
}

/** Assemble a plain-text resume so match scoring / cover letters have context. */
function buildRawText(resume: HHResumeDetail): string {
  const parts: string[] = [];
  const name = [resume.first_name, resume.last_name].filter(Boolean).join(" ").trim();
  if (name) parts.push(name);
  if (resume.title) parts.push(`Желаемая должность: ${resume.title}`);

  const roles = (resume.professional_roles ?? [])
    .map((r) => r?.name)
    .filter(Boolean)
    .join(", ");
  if (roles) parts.push(`Профессиональные роли: ${roles}`);

  const skills = (resume.skill_set ?? []).filter(Boolean);
  if (skills.length) parts.push(`Ключевые навыки: ${skills.join(", ")}`);

  const skillsText = String(resume.skills ?? "").replace(/<[^>]*>/g, " ").trim();
  if (skillsText) parts.push(`О себе: ${skillsText}`);

  const experiences = (resume.experience ?? [])
    .map(experienceLine)
    .filter(Boolean);
  if (experiences.length) {
    parts.push(`Опыт работы:\n${experiences.map((e) => `- ${e}`).join("\n")}`);
  }

  return parts.join("\n");
}

export function mapHhResumeToProfile(resume: HHResumeDetail): ResumeProfile {
  const months = resume.total_experience?.months ?? null;
  const skills = (resume.skill_set ?? [])
    .map((s) => clean(s, 60))
    .filter(Boolean)
    .slice(0, MAX_SKILLS);

  const summarySource =
    resume.professional_roles?.find((r) => r?.name)?.name ??
    resume.experience?.find((e) => e?.position)?.position ??
    "";

  return {
    rawText: buildRawText(resume),
    title: clean(resume.title, TITLE_MAX),
    skills,
    seniority: clean(seniorityFromMonths(months), SENIORITY_MAX),
    summary: clean(summarySource, SUMMARY_MAX),
    experienceId: experienceIdFromMonths(months),
    updatedAt: Date.now(),
  };
}

/** Human-readable experience label for the resume chooser UI. */
export function experienceLabelFromMonths(
  months: number | null | undefined,
): string {
  if (!months || months <= 0) return "Без опыта";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yLabel =
    years > 0
      ? `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`
      : "";
  const mLabel = rest > 0 ? `${rest} мес.` : "";
  return [yLabel, mLabel].filter(Boolean).join(" ") || "Менее месяца";
}

/** Trim a resume list item down to what the chooser UI needs. */
export interface HhResumeChoice {
  id: string;
  title: string;
  area: string | null;
  experience: string;
  updatedAt: string | null;
}

export function toResumeChoice(item: HHResumeListItem): HhResumeChoice {
  return {
    id: item.id,
    title: item.title?.trim() || "Без названия",
    area: item.area?.name ?? null,
    experience: experienceLabelFromMonths(item.total_experience?.months ?? null),
    updatedAt: item.updated_at ?? null,
  };
}
