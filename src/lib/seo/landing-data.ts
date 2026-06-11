import "server-only";
import { searchVacancies } from "@/lib/hh/client";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { City, Profession } from "./catalog";

// 6h cache: fresh enough for a listing, light on hh.ru rate limits. One HH call
// per page per window (~26 pages total).
const REVALIDATE = 21_600;
const SAMPLE = 100; // hh.ru max per_page — used to compute stats
export const ALL_RUSSIA = "113";

// Below this many results a page is too thin to deserve indexing (doorway-page
// guard). The page still renders, but with robots: noindex.
export const INDEX_THRESHOLD = 20;

export interface SalaryStats {
  from: number | null;
  to: number | null;
  median: number | null;
}

export interface ProfessionLanding {
  found: number;
  indexable: boolean;
  /** Vacancies to display (subset of the sample). */
  items: HHVacancyItem[];
  salary: SalaryStats;
  /** Share of sampled vacancies offering remote work, 0..1, or null. */
  remoteShare: number | null;
  topEmployers: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
}

/** Midpoint of a salary range in RUR, or null if not usable. */
function rubMidpoint(v: HHVacancyItem): number | null {
  const s = v.salary;
  if (!s || (s.currency && s.currency !== "RUR" && s.currency !== "RUB")) {
    return null;
  }
  if (s.from != null && s.to != null) return Math.round((s.from + s.to) / 2);
  return s.from ?? s.to ?? null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function topBy(
  items: HHVacancyItem[],
  key: (v: HHVacancyItem) => string | undefined,
  limit: number,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of items) {
    const name = key(v)?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Fetch + aggregate everything a profession landing page needs. */
export async function getProfessionLanding(
  prof: Profession,
  area: string = ALL_RUSSIA,
): Promise<ProfessionLanding> {
  let found = 0;
  let items: HHVacancyItem[] = [];
  try {
    const data = await searchVacancies(
      {
        professional_role: prof.query.professionalRole,
        text: prof.query.text,
        area,
        order_by: "publication_time", // freshest first for the listing
        per_page: SAMPLE,
        page: 0,
      },
      { revalidate: REVALIDATE },
    );
    found = data.found ?? 0;
    items = data.items ?? [];
  } catch {
    // hh.ru hiccup (rate limit / token) must not fail the build — render an
    // empty, non-indexable page; ISR will refill it on the next revalidate.
    return {
      found: 0,
      indexable: false,
      items: [],
      salary: { from: null, to: null, median: null },
      remoteShare: null,
      topEmployers: [],
      topCities: [],
    };
  }

  const mids = items.map(rubMidpoint).filter((n): n is number => n != null);
  const froms = items
    .map((v) => (v.salary?.currency === "RUR" ? v.salary?.from : null))
    .filter((n): n is number => n != null);
  const tos = items
    .map((v) => (v.salary?.currency === "RUR" ? v.salary?.to : null))
    .filter((n): n is number => n != null);

  const salary: SalaryStats = {
    from: froms.length ? Math.min(...froms) : null,
    to: tos.length ? Math.max(...tos) : null,
    median: median(mids),
  };

  const remoteCount = items.filter((v) => v.schedule?.id === "remote").length;
  const remoteShare = items.length ? remoteCount / items.length : null;

  return {
    found,
    indexable: found >= INDEX_THRESHOLD,
    items: items.slice(0, 15),
    salary,
    remoteShare,
    topEmployers: topBy(items, (v) => v.employer?.name, 6),
    topCities: topBy(items, (v) => v.area?.name, 8),
  };
}

const rub = new Intl.NumberFormat("ru-RU");

/** Data-driven FAQ — numbers differ per page, so each page is genuinely unique. */
export function buildProfessionFaq(
  prof: Profession,
  data: ProfessionLanding,
  city?: City,
): { question: string; answer: string }[] {
  const where = city ? ` ${city.prepositional}` : ""; // " в Москве"
  const region = city ? city.prepositional : "по России";

  const faq: { question: string; answer: string }[] = [
    {
      question: `Сколько вакансий ${prof.genitive}${where} сейчас открыто?`,
      answer: `Сейчас ${region} открыто около ${rub.format(data.found)} вакансий ${prof.genitive}. JobSwiper отбирает из них подходящие именно вам по резюме и оценивает совпадение.`,
    },
  ];

  if (data.salary.median != null) {
    const parts: string[] = [];
    if (data.salary.from != null && data.salary.to != null) {
      parts.push(`от ${rub.format(data.salary.from)} до ${rub.format(data.salary.to)} ₽`);
    }
    faq.push({
      question: `Сколько зарабатывает ${prof.nominative.toLowerCase()}${where}?`,
      answer: `По текущим вакансиям${where} с указанной зарплатой медиана для роли «${prof.nominative}» — около ${rub.format(data.salary.median)} ₽${parts.length ? `, диапазон ${parts[0]}` : ""}. Точная сумма зависит от опыта и компании.`,
    });
  }

  if (data.remoteShare != null && data.remoteShare > 0) {
    faq.push({
      question: `Можно ли работать удалённо?`,
      answer: `Да, часть вакансий ${prof.genitive}${where} предлагает удалённый формат — в текущей выборке это около ${Math.round(data.remoteShare * 100)}%. Формат работы виден в карточке каждой вакансии.`,
    });
  }

  faq.push(
    {
      question: `Как JobSwiper подбирает вакансии ${prof.genitive}?`,
      answer: `Вы загружаете резюме, а сервис сравнивает ваш опыт и навыки с требованиями вакансий, показывает процент совпадения и помогает подготовить сопроводительное письмо под конкретный отклик.`,
    },
    {
      question: `Сколько стоит подбор?`,
      answer: `Начать можно бесплатно. Лимиты откликов и оценок покупаются разовыми пакетами без подписки и действуют 12 месяцев.`,
    },
  );

  return faq;
}
