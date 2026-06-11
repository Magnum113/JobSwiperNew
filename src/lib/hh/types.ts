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

/** Normalized search params our /api/vacancies route accepts. */
export interface VacancySearchParams {
  text?: string;
  area?: string;
  /** hh.ru professional_role dictionary ids (repeatable). Used by SEO landings. */
  professional_role?: string[];
  salary?: number;
  only_with_salary?: boolean;
  experience?: string[];
  employment?: string[];
  schedule?: string[];
  order_by?: string;
  per_page?: number;
  page?: number;
}
