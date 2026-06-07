import type { HHVacancyItem } from "./hh/types";

/** Parsed profile derived from the user's pasted resume (via AI). */
export interface ResumeProfile {
  /** Raw resume text the user pasted. */
  rawText: string;
  /** Profession / job title — auto-filled into the search filter. */
  title: string;
  /** Key skills extracted from the resume. */
  skills: string[];
  /** Seniority label, e.g. "Middle", "Senior". */
  seniority: string;
  /** One-line professional summary. */
  summary: string;
  /** Suggested hh.ru experience id, e.g. "between3And6". */
  experienceId: string;
  updatedAt: number;
}

/** AI-computed compatibility between the resume and a vacancy. */
export interface MatchResult {
  score: number; // 0–100
  strengths: string[];
  gaps: string[];
  summary: string;
}

export type AsyncStatus = "idle" | "loading" | "done" | "error";

export interface CoverLetterState {
  text: string;
  status: AsyncStatus;
  createdAt: number;
}

/** A vacancy the user swiped right on. */
export interface LikedItem {
  vacancy: HHVacancyItem;
  match?: MatchResult;
  coverLetter: CoverLetterState;
  likedAt: number;
}

/** A cover letter generated for a vacancy pasted manually (not from hh.ru). */
export interface CustomLetter {
  id: string;
  title: string;
  company: string;
  vacancyText: string;
  letter: CoverLetterState;
  createdAt: number;
}

export interface Filters {
  /** Free-text query; auto-seeded from the resume's profession title. */
  text: string;
  area: string;
  experience: string[];
  employment: string[];
  schedule: string[];
  salary?: number;
  onlyWithSalary: boolean;
  orderBy: string;
}

export type SwipeDirection = "left" | "right";
