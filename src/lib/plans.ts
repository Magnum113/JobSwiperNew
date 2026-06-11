// One-time limit packs — single source of truth for the paywall UI.
// Pricing rationale and unit economics live in PRICING.md.

export interface Plan {
  id: "starter" | "max";
  name: string;
  /** Price in rubles. */
  price: number;
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

export type PlanId = Plan["id"];

export const FREE_LIMITS = {
  responses: 10,
  resumes: 3,
  analyses: 100,
} as const;

/** One-time bonus granted from the paywall while payments are being wired up. */
export const BONUS_RESPONSES = 50;

export interface Limits {
  responses: number;
  analyses: number;
  resumes: number;
}

/** Effective limits for a free user (plus the gifted responses, once claimed). */
export function getFreeLimits(bonusClaimed: boolean): Limits {
  return {
    responses: FREE_LIMITS.responses + (bonusClaimed ? BONUS_RESPONSES : 0),
    analyses: FREE_LIMITS.analyses,
    resumes: FREE_LIMITS.resumes,
  };
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Старт",
    price: 99,
    responses: 100,
    resumes: 10,
    analyses: 300,
    note: "Разовый пакет для первых откликов",
  },
  {
    id: "max",
    name: "Максимум",
    price: 299,
    responses: 500,
    resumes: 50,
    analyses: 1000,
    badge: "Выгоднее",
    highlighted: true,
    note: "Больше лимитов за меньшую цену",
  },
];

export function getPlanById(value: unknown): Plan | null {
  if (typeof value !== "string") return null;
  return PLANS.find((plan) => plan.id === value) ?? null;
}

export function getPlanAmountKopeks(plan: Plan): number {
  return Math.round(plan.price * 100);
}

export const PRO_BENEFITS = [
  "AI-сопроводительное письмо к каждому отклику",
  "Умный подбор: самые подходящие вакансии — первыми",
  "Сотни откликов и анализов вакансий",
  "Несколько резюме под разные роли",
  "Приоритетная генерация без очередей",
];
