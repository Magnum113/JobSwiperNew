import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import {
  clearAppSessionCookie,
  setAppSessionCookie,
  stableProviderUserId,
  type AppAuthUser,
} from "@/lib/auth/app-session";
import {
  clearHhTempCookies,
  logHhAuth,
  redirectNoStore,
  safeAuthError,
  safeNextPath,
  warnHhAuth,
  HH_API_BASE,
  HH_AUTH_NEXT_COOKIE,
  HH_AUTH_STATE_COOKIE,
  HH_AUTH_VERIFIER_COOKIE,
} from "@/lib/auth/hh";
import { exchangeHhCode, hhUserGet } from "@/lib/hh/user-token";
import { mapHhResumeToProfile } from "@/lib/hh/resume-map";
import { saveHhConnection, saveProfile } from "@/lib/supabase/queries";
import { getAppOrigin } from "@/lib/site-url";
import type {
  HHMeResponse,
  HHResumeDetail,
  HHResumeListResponse,
} from "@/lib/hh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestId(): string {
  return randomBytes(8).toString("hex");
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Build the redirect back to the app. `hh` carries the resume-import outcome so
 * the profile page can react (single import, chooser, or empty).
 */
function resultRedirect(
  appOrigin: string,
  next: string,
  result: "success" | "error",
  opts: { error?: string; hh?: "imported" | "choose" | "empty" } = {},
) {
  const redirectUrl = new URL(next, appOrigin);
  redirectUrl.searchParams.set("auth", result);
  redirectUrl.searchParams.set("provider", "hh");
  if (opts.error) redirectUrl.searchParams.set("auth_error", safeAuthError(opts.error));
  if (opts.hh) redirectUrl.searchParams.set("hh", opts.hh);

  const response = redirectNoStore(redirectUrl);
  clearHhTempCookies(response);
  if (result === "error") clearAppSessionCookie(response);
  return response;
}

export async function GET(req: Request) {
  const rid = requestId();
  const url = new URL(req.url);
  const appOrigin = getAppOrigin(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(HH_AUTH_STATE_COOKIE)?.value ?? null;
  const verifier = cookieStore.get(HH_AUTH_VERIFIER_COOKIE)?.value ?? null;
  const next = safeNextPath(
    cookieStore.get(HH_AUTH_NEXT_COOKIE)?.value ?? url.searchParams.get("next"),
  );

  logHhAuth("callback_received", {
    rid,
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasExpectedState: Boolean(expectedState),
    hasVerifier: Boolean(verifier),
    hasOauthError: Boolean(oauthError),
  });

  if (oauthError) {
    warnHhAuth("provider_error", { rid, error: safeAuthError(oauthError) });
    return resultRedirect(appOrigin, next, "error", { error: oauthError });
  }
  if (!code) {
    warnHhAuth("missing_code", { rid });
    return resultRedirect(appOrigin, next, "error", { error: "OAuth code is missing" });
  }
  if (!state || !expectedState || state !== expectedState) {
    warnHhAuth("state_mismatch", { rid });
    return resultRedirect(appOrigin, next, "error", { error: "OAuth state mismatch" });
  }
  if (!verifier) {
    warnHhAuth("missing_verifier", { rid });
    return resultRedirect(appOrigin, next, "error", {
      error: "OAuth code verifier is missing",
    });
  }

  try {
    const redirectUri = new URL("/api/auth/hh/callback", appOrigin).toString();
    const token = await exchangeHhCode(code, verifier, redirectUri);
    logHhAuth("token_received", { rid, hasRefreshToken: Boolean(token.refreshToken) });

    const me = await hhUserGet<HHMeResponse>(token.accessToken, "/me");
    const hhUserId = str(me.id);
    if (!hhUserId) {
      warnHhAuth("me_missing_id", { rid });
      return resultRedirect(appOrigin, next, "error", { error: "hh.ru user id is missing" });
    }
    if (me.is_applicant === false) {
      warnHhAuth("not_applicant", { rid });
      return resultRedirect(appOrigin, next, "error", {
        error: "Войдите аккаунтом соискателя hh.ru",
      });
    }

    const fullName = [str(me.first_name), str(me.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim();
    const user: AppAuthUser = {
      id: stableProviderUserId("hh", hhUserId),
      email: str(me.email),
      name: fullName || str(me.first_name),
      avatarUrl: null,
      provider: "hh",
    };

    // Set the session first so the rest is attributed to the right account.
    const probe = resultRedirect(appOrigin, next, "success");
    if (!setAppSessionCookie(probe, user)) {
      warnHhAuth("session_secret_missing", { rid });
      return resultRedirect(appOrigin, next, "error", {
        error: "APP_SESSION_SECRET is not configured",
      });
    }

    await saveHhConnection(user.id, {
      hhUserId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    });

    // Resume import is best-effort: the user is already authenticated (session
    // + tokens saved), so a hiccup pulling resumes must not fail the login. On
    // failure we land them signed in with no auto-import (?hh=empty); the
    // chooser still works later via /api/hh/resumes.
    let outcome: "imported" | "choose" | "empty" = "empty";
    try {
      // Use the URL hh.ru gives us, don't hardcode.
      const resumesUrl = str(me.resumes_url) ?? `${HH_API_BASE}/resumes/mine`;
      const list = await hhUserGet<HHResumeListResponse>(token.accessToken, resumesUrl);
      const items = Array.isArray(list.items) ? list.items : [];

      if (items.length === 1) {
        const detail = await hhUserGet<HHResumeDetail>(
          token.accessToken,
          `/resumes/${encodeURIComponent(items[0].id)}`,
        );
        await saveProfile(user.id, mapHhResumeToProfile(detail));
        outcome = "imported";
      } else if (items.length > 1) {
        outcome = "choose";
      }
      logHhAuth("success", { rid, resumes: items.length, outcome });
    } catch (resumeError) {
      warnHhAuth("resume_import_failed", {
        rid,
        message: safeAuthError(
          resumeError instanceof Error ? resumeError.message : "resume import failed",
        ),
      });
    }

    // Re-issue the final redirect carrying the outcome, keeping the session.
    const response = resultRedirect(appOrigin, next, "success", { hh: outcome });
    setAppSessionCookie(response, user);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "hh.ru OAuth failed";
    warnHhAuth("callback_failed", { rid, message: safeAuthError(message) });
    return resultRedirect(appOrigin, next, "error", { error: message });
  }
}
