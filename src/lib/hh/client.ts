import "server-only";
import type {
  HHSearchResponse,
  HHVacancyDetail,
  VacancySearchParams,
} from "./types";
import { getAppToken } from "./token";

const HH_BASE = "https://api.hh.ru";

// HH requires a descriptive User-Agent or it returns 400.
// Format: AppName/Version (contact-email)
const HH_UA = "JobSwiper/1.0 (kadimagomedovv@gmail.com)";

export class HHError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HHError";
  }
}

async function hhHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "User-Agent": HH_UA,
    Accept: "application/json",
  };
  // App token lifts anonymous CAPTCHA/anti-bot throttling.
  const token = await getAppToken().catch(() => null);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * GET against the HH API with the app token attached. On 401/403 (possibly an
 * expired token) it force-refreshes the token once and retries.
 */
async function hhGet(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
): Promise<Response> {
  let res = await fetch(url, { ...init, headers: await hhHeaders() });
  if (res.status === 401 || res.status === 403) {
    await getAppToken(true).catch(() => {});
    res = await fetch(url, { ...init, headers: await hhHeaders() });
  }
  return res;
}

// page * per_page must stay <= 2000 on hh.ru.
const MAX_DEPTH = 2000;

export function buildSearchQuery(params: VacancySearchParams): URLSearchParams {
  const qs = new URLSearchParams();
  const perPage = Math.min(Math.max(params.per_page ?? 20, 1), 100);
  let page = Math.max(params.page ?? 0, 0);
  if ((page + 1) * perPage > MAX_DEPTH) {
    page = Math.max(Math.floor(MAX_DEPTH / perPage) - 1, 0);
  }

  if (params.text?.trim()) qs.set("text", params.text.trim());
  if (params.area && params.area !== "any") qs.set("area", params.area);
  if (params.salary && params.salary > 0) {
    qs.set("salary", String(params.salary));
    qs.set("currency", "RUR");
  }
  if (params.only_with_salary) qs.set("only_with_salary", "true");
  for (const exp of params.experience ?? []) qs.append("experience", exp);
  for (const emp of params.employment ?? []) qs.append("employment", emp);
  for (const sch of params.schedule ?? []) qs.append("schedule", sch);
  if (params.order_by) qs.set("order_by", params.order_by);

  qs.set("per_page", String(perPage));
  qs.set("page", String(page));
  return qs;
}

export async function searchVacancies(
  params: VacancySearchParams,
): Promise<HHSearchResponse> {
  const qs = buildSearchQuery(params);
  const res = await hhGet(`${HH_BASE}/vacancies?${qs.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new HHError(
      `Не удалось загрузить вакансии (hh.ru ответил ${res.status})`,
      res.status,
    );
  }
  return (await res.json()) as HHSearchResponse;
}

export async function getVacancy(id: string): Promise<HHVacancyDetail> {
  const res = await hhGet(`${HH_BASE}/vacancies/${encodeURIComponent(id)}`, {
    // Vacancy details are fairly stable; cache for an hour.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new HHError(
      `Не удалось загрузить вакансию (hh.ru ответил ${res.status})`,
      res.status,
    );
  }
  return (await res.json()) as HHVacancyDetail;
}

interface HHAreaNode {
  id: string;
  name: string;
  parent_id: string | null;
  areas: HHAreaNode[];
}

// The raw /areas/113 response is ~2.8MB (too big for Next's fetch cache), so we
// cache the small flattened result in memory for the process lifetime instead.
let areasCache: { id: string; name: string }[] | null = null;

/** Flatten the Russia area tree into a popular -> all city list (id, name). */
export async function getRussianAreas(): Promise<{ id: string; name: string }[]> {
  if (areasCache) return areasCache;

  const res = await hhGet(`${HH_BASE}/areas/113`, { cache: "no-store" });
  if (!res.ok) {
    throw new HHError(`Не удалось загрузить регионы (${res.status})`, res.status);
  }
  const russia = (await res.json()) as HHAreaNode;

  const out: { id: string; name: string }[] = [
    { id: "113", name: "Вся Россия" },
  ];
  // russia.areas = regions; each region may contain cities.
  for (const region of russia.areas ?? []) {
    out.push({ id: region.id, name: region.name });
    for (const city of region.areas ?? []) {
      out.push({ id: city.id, name: city.name });
    }
  }

  areasCache = out;
  return out;
}
