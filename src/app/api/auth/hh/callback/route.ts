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
  exchangeHhCodeForToken,
  fetchHhMe,
  logHhAuth,
  redirectNoStore,
  safeAuthError,
  safeNextPath,
  warnHhAuth,
  HH_AUTH_NEXT_COOKIE,
  HH_AUTH_STATE_COOKIE,
  HH_AUTH_VERIFIER_COOKIE,
} from "@/lib/auth/hh";
import { getAppOrigin } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestId(): string {
  return randomBytes(8).toString("hex");
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resultRedirect(
  appOrigin: string,
  next: string,
  result: "success" | "error",
  error?: string,
) {
  const redirectUrl = new URL(next, appOrigin);
  redirectUrl.searchParams.set("auth", result);
  redirectUrl.searchParams.set("provider", "hh");
  if (error) redirectUrl.searchParams.set("auth_error", safeAuthError(error));

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
    return resultRedirect(appOrigin, next, "error", oauthError);
  }
  if (!code) {
    warnHhAuth("missing_code", { rid });
    return resultRedirect(appOrigin, next, "error", "OAuth code is missing");
  }
  if (!state || !expectedState || state !== expectedState) {
    warnHhAuth("state_mismatch", { rid });
    return resultRedirect(appOrigin, next, "error", "OAuth state mismatch");
  }
  if (!verifier) {
    warnHhAuth("missing_verifier", { rid });
    return resultRedirect(appOrigin, next, "error", "OAuth code verifier is missing");
  }

  try {
    const redirectUri = new URL("/api/auth/hh/callback", appOrigin).toString();
    const accessToken = await exchangeHhCodeForToken(code, verifier, redirectUri);

    // Use the user token once, just to read identity; we don't store it.
    const me = await fetchHhMe(accessToken);
    const hhUserId = str(me.id);
    if (!hhUserId) {
      warnHhAuth("me_missing_id", { rid });
      return resultRedirect(appOrigin, next, "error", "hh.ru user id is missing");
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

    const response = resultRedirect(appOrigin, next, "success");
    if (!setAppSessionCookie(response, user)) {
      warnHhAuth("session_secret_missing", { rid });
      return resultRedirect(
        appOrigin,
        next,
        "error",
        "APP_SESSION_SECRET is not configured",
      );
    }

    logHhAuth("success", { rid, hasEmail: Boolean(user.email), hasName: Boolean(user.name) });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "hh.ru OAuth failed";
    warnHhAuth("callback_failed", { rid, message: safeAuthError(message) });
    return resultRedirect(appOrigin, next, "error", message);
  }
}
