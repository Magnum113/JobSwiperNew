import type { ResumeProfile } from "./types";

/** Compact, AI-friendly representation of the resume for match/cover-letter calls. */
export function buildResumeContext(p: ResumeProfile | null): string {
  if (!p) return "";
  const parts: string[] = [];
  if (p.title) parts.push(`Профессия: ${p.title}`);
  if (p.seniority) parts.push(`Уровень: ${p.seniority}`);
  if (p.skills?.length) parts.push(`Ключевые навыки: ${p.skills.join(", ")}`);
  if (p.summary) parts.push(`Кратко: ${p.summary}`);
  if (p.rawText) parts.push(`Полное резюме:\n${p.rawText}`);
  return parts.join("\n");
}
