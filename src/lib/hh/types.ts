// Types for the HeadHunter (hh.ru) public API.
// Only the fields this app actually consumes are modelled.

export interface HHSalary {
  from: number | null;
  to: number | null;
  currency: string | null;
  gross: boolean | null;
}

export interface HHLogoUrls {
  "90"?: string;
  "240"?: string;
  original?: string;
}

export interface HHEmployer {
  id?: string;
  name: string;
  alternate_url?: string | null;
  logo_urls?: HHLogoUrls | null;
  accredited_it_employer?: boolean;
}

export interface HHArea {
  id: string;
  name: string;
}

export interface HHSnippet {
  requirement: string | null;
  responsibility: string | null;
}

export interface HHIdName {
  id: string;
  name: string;
}

export interface HHKeySkill {
  name: string;
}

/** A single vacancy as returned by `GET /vacancies` (search results). */
export interface HHVacancyItem {
  id: string;
  name: string;
  alternate_url: string | null;
  apply_alternate_url: string | null;
  salary: HHSalary | null;
  employer: HHEmployer;
  area: HHArea;
  snippet: HHSnippet | null;
  experience: HHIdName | null;
  employment: HHIdName | null;
  schedule: HHIdName | null;
  professional_roles?: HHIdName[];
  published_at: string;
  archived?: boolean;
}

/** Extra fields available from `GET /vacancies/{id}` (detail view). */
export interface HHVacancyDetail extends HHVacancyItem {
  description: string; // full HTML
  key_skills?: HHKeySkill[];
}

export interface HHSearchResponse {
  found: number;
  pages: number;
  per_page: number;
  page: number;
  items: HHVacancyItem[];
}

/* ----------------------- Applicant resumes (user OAuth) ------------------- */

/** `GET /me` for an authorized applicant (only the fields we use). */
export interface HHMeResponse {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  mid_name?: string | null;
  middle_name?: string | null;
  is_applicant?: boolean;
  /** URL to GET the current user's resume list (use this, don't hardcode). */
  resumes_url?: string | null;
}

export interface HHTotalExperience {
  months: number | null;
}

/** A resume as it appears in the `resumes_url` list (short form). */
export interface HHResumeListItem {
  id: string;
  title: string | null;
  area?: HHArea | null;
  total_experience?: HHTotalExperience | null;
  updated_at?: string | null;
  alternate_url?: string | null;
}

export interface HHResumeListResponse {
  found?: number;
  items: HHResumeListItem[];
}

/** Work-experience entry from a full resume. */
export interface HHResumeExperience {
  company?: string | null;
  position?: string | null;
  description?: string | null;
  start?: string | null;
  end?: string | null;
}

export interface HHResumeProfessionalRole {
  id?: string;
  name?: string | null;
}

/** Full resume from `GET /resumes/{resume_id}` (only the fields we map). */
export interface HHResumeDetail extends HHResumeListItem {
  /** Free-form skills description text. */
  skills?: string | null;
  /** Unique key-skill strings. */
  skill_set?: string[] | null;
  professional_roles?: HHResumeProfessionalRole[] | null;
  experience?: HHResumeExperience[] | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
}

/** Normalized search params our /api/vacancies route accepts. */
export interface VacancySearchParams {
  text?: string;
  area?: string;
  salary?: number;
  only_with_salary?: boolean;
  experience?: string[];
  employment?: string[];
  schedule?: string[];
  order_by?: string;
  per_page?: number;
  page?: number;
}
