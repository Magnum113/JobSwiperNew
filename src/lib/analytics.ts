export const YM_COUNTER_ID = 109742095;

export const ANALYTICS_GOALS = {
  resumeAnalyzeSuccess: "resume_analyze_success",
  vacancyFeedLoaded: "vacancy_feed_loaded",
  responseCreated: "response_created",
  coverLetterSuccess: "cover_letter_success",
  hhApplyClick: "hh_apply_click",
  paywallOpen: "paywall_open",
  subscriptionCtaClick: "subscription_cta_click",
  limitDialogOpen: "limit_dialog_open",
  vacancyFeedError: "vacancy_feed_error",
  coverLetterError: "cover_letter_error",
} as const;

export type AnalyticsGoal =
  (typeof ANALYTICS_GOALS)[keyof typeof ANALYTICS_GOALS];

type AnalyticsParam = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsParam>;

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
  }
}

function normalizeParams(
  params?: AnalyticsParams,
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;

  const normalized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    normalized[key] =
      typeof value === "string" && value.length > 160
        ? value.slice(0, 160)
        : value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function trackGoal(goal: AnalyticsGoal, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return;
  window.ym?.(YM_COUNTER_ID, "reachGoal", goal, normalizeParams(params));
}
