import type { HHSalary, HHSnippet } from "./types";

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUR: "₽",
  RUB: "₽",
  USD: "$",
  EUR: "€",
  KZT: "₸",
  BYR: "Br",
  BYN: "Br",
  UAH: "₴",
  GEL: "₾",
  AZN: "₼",
  UZS: "сум",
  KGS: "сом",
};

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₽";
  return CURRENCY_SYMBOLS[code] ?? code;
}

const numberFmt = new Intl.NumberFormat("ru-RU");

/** Human-readable salary string, e.g. "150 000 – 200 000 ₽". */
export function formatSalary(salary: HHSalary | null | undefined): string {
  if (!salary || (salary.from == null && salary.to == null)) {
    return "Зарплата не указана";
  }
  const sym = currencySymbol(salary.currency);
  const from = salary.from != null ? numberFmt.format(salary.from) : null;
  const to = salary.to != null ? numberFmt.format(salary.to) : null;

  let amount: string;
  if (from && to) amount = `${from} – ${to}`;
  else if (from) amount = `от ${from}`;
  else amount = `до ${to}`;

  return `${amount} ${sym}`;
}

/** Short salary for compact badges, e.g. "150к–200к ₽". */
export function formatSalaryShort(salary: HHSalary | null | undefined): string {
  if (!salary || (salary.from == null && salary.to == null)) return "—";
  const sym = currencySymbol(salary.currency);
  const k = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}к` : `${n}`;
  const from = salary.from != null ? k(salary.from) : null;
  const to = salary.to != null ? k(salary.to) : null;
  if (from && to) return `${from}–${to} ${sym}`;
  if (from) return `от ${from} ${sym}`;
  return `до ${to} ${sym}`;
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&laquo;": "«",
  "&raquo;": "»",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

function decodeEntities(text: string): string {
  return text.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m] ?? m);
}

/** Strip all HTML tags and decode entities → plain text. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Combine the search snippet into one clean plain-text teaser. */
export function cleanSnippet(snippet: HHSnippet | null | undefined): string {
  if (!snippet) return "";
  const parts = [snippet.requirement, snippet.responsibility]
    .filter(Boolean)
    .map((p) => stripHtml(p));
  return parts.join(" ").trim();
}

/** "сегодня" / "вчера" / "N дней назад" from an ISO date string. */
export function relativeDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 5) return `${days} дня назад`;
  if (days < 7) return `${days} дней назад`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "неделю назад";
  if (weeks < 5) return `${weeks} нед. назад`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "месяц назад" : `${months} мес. назад`;
}

/** Initials for an employer logo fallback. */
export function employerInitials(name: string): string {
  return name
    .replace(/["«»“”]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
