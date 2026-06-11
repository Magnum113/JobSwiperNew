import "server-only";
import type {
  HHSearchResponse,
  HHVacancyDetail,
  VacancySearchParams,
} from "./types";
import { getAppToken, invalidateAppToken } from "./token";

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

interface HHApiErrorItem {
  type?: unknown;
  value?: unknown;
}

interface HHApiErrorBody {
  errors?: HHApiErrorItem[];
}

async function hhHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "HH-User-Agent": HH_UA,
    Accept: "application/json",
  };
  // App token lifts anonymous CAPTCHA/anti-bot throttling.
  const token = await getAppToken().catch(() => null);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function oauthErrorValue(res: Response): Promise<string | null> {
  if (res.status !== 401 && res.status !== 403) return null;
  const body = await res
    .clone()
    .json()
    .catch(() => null) as HHApiErrorBody | null;
  const errors = Array.isArray(body?.errors) ? body.errors : [];
  const oauth = errors.find((e) => e?.type === "oauth");
  return typeof oauth?.value === "string" ? oauth.value : null;
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
    const rejectedToken = await getAppToken().catch(() => null);
    const oauthValue = await oauthErrorValue(res);
    if (oauthValue) {
      await invalidateAppToken(rejectedToken ?? undefined);
    }
    const freshToken = await getAppToken(true, {
      allowStaleFallback: !oauthValue,
    }).catch(() => null);
    if (freshToken && freshToken !== rejectedToken) {
      res = await fetch(url, { ...init, headers: await hhHeaders() });
    }
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
  for (const role of params.professional_role ?? []) {
    qs.append("professional_role", role);
  }
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
  // The live app passes nothing → no-store (always fresh). SEO landing pages
  // pass a `revalidate` so the fetch is cached and the route can be statically
  // generated / ISR'd instead of going dynamic.
  options: { revalidate?: number } = {},
): Promise<HHSearchResponse> {
  const qs = buildSearchQuery(params);
  const init =
    options.revalidate != null
      ? { next: { revalidate: options.revalidate } }
      : { cache: "no-store" as const };
  const res = await hhGet(`${HH_BASE}/vacancies?${qs.toString()}`, init);

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

// hh.ru returns the area tree in its own (roughly alphabetical-by-region) order,
// so the head of the flattened list is obscure small towns. Surface the biggest
// cities first instead — matched by name so we use hh.ru's real ids.
const POPULAR_CITIES = [
  "Москва",
  "Санкт-Петербург",
  "Новосибирск",
  "Екатеринбург",
  "Казань",
  "Нижний Новгород",
  "Челябинск",
  "Самара",
  "Уфа",
  "Ростов-на-Дону",
  "Краснодар",
  "Омск",
  "Воронеж",
  "Пермь",
  "Волгоград",
  "Красноярск",
];

/** Flatten the Russia area tree into a popular -> all city list (id, name). */
export async function getRussianAreas(): Promise<{ id: string; name: string }[]> {
  if (areasCache) return areasCache;

  const res = await hhGet(`${HH_BASE}/areas/113`, { cache: "no-store" });
  if (!res.ok) {
    throw new HHError(`Не удалось загрузить регионы (${res.status})`, res.status);
  }
  const russia = (await res.json()) as HHAreaNode;

  // Flatten regions + their cities in tree order first.
  const all: { id: string; name: string }[] = [];
  for (const region of russia.areas ?? []) {
    all.push({ id: region.id, name: region.name });
    for (const city of region.areas ?? []) {
      all.push({ id: city.id, name: city.name });
    }
  }

  const byName = new Map<string, { id: string; name: string }>();
  for (const a of all) if (!byName.has(a.name)) byName.set(a.name, a);

  // "Вся Россия", then major cities, then everything else in tree order.
  const out: { id: string; name: string }[] = [{ id: "113", name: "Вся Россия" }];
  const used = new Set<string>(["113"]);
  for (const name of POPULAR_CITIES) {
    const a = byName.get(name);
    if (a && !used.has(a.id)) {
      out.push(a);
      used.add(a.id);
    }
  }
  for (const a of all) {
    if (!used.has(a.id)) {
      out.push(a);
      used.add(a.id);
    }
  }

  areasCache = out;
  return out;
}
