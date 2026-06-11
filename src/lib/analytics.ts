export const YM_COUNTER_ID = 109742095;

export const ANALYTICS_GOALS = {
  resumeAnalyzeSuccess: "resume_analyze_success",
  vacancyFeedLoaded: "vacancy_feed_loaded",
  responseCreated: "response_created",
  coverLetterSuccess: "cover_letter_success",
  hhApplyClick: "hh_apply_click",
  paywallOpen: "paywall_open",
  subscriptionCtaClick: "subscription_cta_click",
  paymentSuccess: "payment_success",
  paymentFail: "payment_fail",
  paymentPlanSelect: "payment_plan_select",
  paymentBuyClick: "payment_buy_click",
  paymentAuthRequired: "payment_auth_required",
  paymentCreateStart: "payment_create_start",
  paymentCreateSuccess: "payment_create_success",
  paymentCreateError: "payment_create_error",
  paymentRedirectToBank: "payment_redirect_to_bank",
  paymentReturnSuccess: "payment_return_success",
  paymentReturnFail: "payment_return_fail",
  paymentProcessing: "payment_processing",
  paymentCheckError: "payment_check_error",
  limitDialogOpen: "limit_dialog_open",
  vacancyFeedError: "vacancy_feed_error",
  coverLetterError: "cover_letter_error",
  authStart: "auth_start",
  authSuccess: "auth_success",
  authError: "auth_error",
  authSignOut: "auth_sign_out",
  authGoogleStart: "auth_google_start",
  authGoogleSuccess: "auth_google_success",
  authGoogleError: "auth_google_error",
  authYandexStart: "auth_yandex_start",
  authYandexSuccess: "auth_yandex_success",
  authYandexError: "auth_yandex_error",
  authHhStart: "auth_hh_start",
  authHhSuccess: "auth_hh_success",
  authHhError: "auth_hh_error",
} as const;

export type AnalyticsGoal =
  (typeof ANALYTICS_GOALS)[keyof typeof ANALYTICS_GOALS];

type AnalyticsParam = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsParam>;
export type AuthAnalyticsProvider = "google" | "yandex" | "hh";

const AUTH_PROVIDER_GOALS = {
  google: {
    start: ANALYTICS_GOALS.authGoogleStart,
    success: ANALYTICS_GOALS.authGoogleSuccess,
    error: ANALYTICS_GOALS.authGoogleError,
  },
  yandex: {
    start: ANALYTICS_GOALS.authYandexStart,
    success: ANALYTICS_GOALS.authYandexSuccess,
    error: ANALYTICS_GOALS.authYandexError,
  },
  hh: {
    start: ANALYTICS_GOALS.authHhStart,
    success: ANALYTICS_GOALS.authHhSuccess,
    error: ANALYTICS_GOALS.authHhError,
  },
} as const satisfies Record<
  AuthAnalyticsProvider,
  Record<"start" | "success" | "error", AnalyticsGoal>
>;

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

function withAuthProvider(
  provider: AuthAnalyticsProvider,
  params?: AnalyticsParams,
): AnalyticsParams {
  return { ...params, provider };
}

export function trackAuthStart(
  provider: AuthAnalyticsProvider,
  params?: AnalyticsParams,
): void {
  const payload = withAuthProvider(provider, params);
  trackGoal(ANALYTICS_GOALS.authStart, payload);
  trackGoal(AUTH_PROVIDER_GOALS[provider].start, payload);
}

export function trackAuthSuccess(
  provider: AuthAnalyticsProvider,
  params?: AnalyticsParams,
): void {
  const payload = withAuthProvider(provider, params);
  trackGoal(ANALYTICS_GOALS.authSuccess, payload);
  trackGoal(AUTH_PROVIDER_GOALS[provider].success, payload);
}

export function trackAuthError(
  provider: AuthAnalyticsProvider,
  params?: AnalyticsParams,
): void {
  const payload = withAuthProvider(provider, params);
  trackGoal(ANALYTICS_GOALS.authError, payload);
  trackGoal(AUTH_PROVIDER_GOALS[provider].error, payload);
}

export function trackAuthSignOut(params?: AnalyticsParams): void {
  trackGoal(ANALYTICS_GOALS.authSignOut, params);
}
