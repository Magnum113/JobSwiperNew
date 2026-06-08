// Subscription plans — single source of truth for the paywall UI.
// Pricing rationale and unit economics live in PRICING.md.

export interface Plan {
  id: "week" | "month";
  name: string;
  /** Price in rubles. */
  price: number;
  /** Human period, e.g. "в неделю". */
  period: string;
  responses: number;
  resumes: number;
  analyses: number;
  /** Optional ribbon, e.g. "Выгодно −25%". */
  badge?: string;
  /** Visually emphasised (default-selected) plan. */
  highlighted?: boolean;
  /** Short value note shown under the price. */
  note: string;
}

export const FREE_LIMITS = {
  responses: 10,
  resumes: 3,
  analyses: 30,
} as const;

export const PLANS: Plan[] = [
  {
    id: "week",
    name: "Неделя",
    price: 99,
    period: "в неделю",
    responses: 100,
    resumes: 10,
    analyses: 300,
    note: "Гибко на время активного поиска",
  },
  {
    id: "month",
    name: "Месяц",
    price: 299,
    period: "в месяц",
    responses: 500,
    resumes: 50,
    analyses: 1000,
    badge: "Выгодно −25%",
    highlighted: true,
    note: "Всего 10 ₽ в день",
  },
];

export const PRO_BENEFITS = [
  "AI-сопроводительное письмо к каждому отклику",
  "Умный подбор: самые подходящие вакансии — первыми",
  "Сотни откликов и анализов вакансий",
  "Несколько резюме под разные роли",
  "Приоритетная генерация без очередей",
];
