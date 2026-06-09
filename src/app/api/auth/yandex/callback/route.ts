import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import {
  clearAppSessionCookie,
  setAppSessionCookie,
  stableProviderUserId,
  type AppAuthUser,
} from "@/lib/auth/app-session";
import {
  clearYandexTempCookies,
  getYandexClientId,
  getYandexClientSecret,
  logYandexAuth,
  redirectNoStore,
  safeAuthError,
  safeNextPath,
  warnYandexAuth,
  YANDEX_AUTH_NEXT_COOKIE,
  YANDEX_AUTH_STATE_COOKIE,
  YANDEX_AUTH_VERIFIER_COOKIE,
} from "@/lib/auth/yandex";
import { getAppOrigin } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface YandexTokenResponse {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
  error?: unknown;
  error_description?: unknown;
}

interface YandexUserInfo {
  id?: unknown;
  uid?: unknown;
  login?: unknown;
  default_email?: unknown;
  email?: unknown;
  emails?: unknown;
  real_name?: unknown;
  display_name?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  default_avatar_id?: unknown;
  avatar_id?: unknown;
  is_avatar_empty?: unknown;
}

function requestId(): string {
  return randomBytes(8).toString("hex");
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(values: unknown[]): string | null {
  for (const value of values) {
    const text = stringValue(value);
    if (text) return text;
  }
  return null;
}

function createResultRedirect(
  appOrigin: string,
  next: string,
  result: "success" | "error",
  error?: string,
) {
  const redirectUrl = new URL(next, appOrigin);
  redirectUrl.searchParams.set("auth", result);
  redirectUrl.searchParams.set("provider", "yandex");
  if (error) redirectUrl.searchParams.set("auth_error", safeAuthError(error));

  const response = redirectNoStore(redirectUrl);
  clearYandexTempCookies(response);
  if (result === "error") clearAppSessionCookie(response);
  return response;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function tokenError(data: YandexTokenResponse | null): string {
  return safeAuthError(
    stringValue(data?.error_description) ?? stringValue(data?.error),
  );
}

async function exchangeCodeForToken(
  code: string,
  verifier: string,
): Promise<YandexTokenResponse & { access_token: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getYandexClientId(),
    code_verifier: verifier,
  });
  const clientSecret = getYandexClientSecret();
  if (clientSecret) body.set("client_secret", clientSecret);

  const response = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await readJson<YandexTokenResponse>(response);
  const accessToken = stringValue(data?.access_token);

  if (!response.ok || !accessToken) {
    throw new Error(tokenError(data));
  }

  return {
    ...data,
    access_token: accessToken,
  };
}

async function fetchUserInfo(accessToken: string): Promise<YandexUserInfo> {
  const response = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  const data = await readJson<YandexUserInfo>(response);
  if (!response.ok || !data) {
    throw new Error(`userinfo failed: ${response.status}`);
  }
  return data;
}

function mapYandexUser(data: YandexUserInfo): AppAuthUser | null {
  const yandexId = stringValue(data.id) ?? stringValue(data.uid);
  if (!yandexId) return null;

  const emails = Array.isArray(data.emails) ? data.emails : [];
  const firstName = stringValue(data.first_name);
  const lastName = stringValue(data.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const avatarId = stringValue(data.default_avatar_id) ?? stringValue(data.avatar_id);
  const isAvatarEmpty = data.is_avatar_empty === true;

  return {
    id: stableProviderUserId("yandex", yandexId),
    email: firstString([data.default_email, data.email, ...emails]),
    name: firstString([data.real_name, data.display_name, fullName, data.login]),
    avatarUrl:
      avatarId && !isAvatarEmpty
        ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`
        : null,
    provider: "yandex",
  };
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
  const expectedState = cookieStore.get(YANDEX_AUTH_STATE_COOKIE)?.value ?? null;
  const verifier = cookieStore.get(YANDEX_AUTH_VERIFIER_COOKIE)?.value ?? null;
  const next = safeNextPath(
    cookieStore.get(YANDEX_AUTH_NEXT_COOKIE)?.value ??
      url.searchParams.get("next"),
  );

  logYandexAuth("callback_received", {
    rid,
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasExpectedState: Boolean(expectedState),
    hasVerifier: Boolean(verifier),
    hasOauthError: Boolean(oauthError),
  });

  if (oauthError) {
    warnYandexAuth("provider_error", {
      rid,
      error: safeAuthError(oauthError),
    });
    return createResultRedirect(appOrigin, next, "error", oauthError);
  }

  if (!code) {
    warnYandexAuth("missing_code", { rid });
    return createResultRedirect(appOrigin, next, "error", "OAuth code is missing");
  }

  if (!state || !expectedState || state !== expectedState) {
    warnYandexAuth("state_mismatch", {
      rid,
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
    });
    return createResultRedirect(appOrigin, next, "error", "OAuth state mismatch");
  }

  if (!verifier) {
    warnYandexAuth("missing_verifier", { rid });
    return createResultRedirect(
      appOrigin,
      next,
      "error",
      "OAuth code verifier is missing",
    );
  }

  try {
    const token = await exchangeCodeForToken(code, verifier);
    logYandexAuth("token_received", {
      rid,
      tokenType: stringValue(token.token_type),
      hasRefreshToken: Boolean(token.refresh_token),
      scope: stringValue(token.scope),
    });

    const userInfo = await fetchUserInfo(token.access_token);
    const user = mapYandexUser(userInfo);

    if (!user) {
      warnYandexAuth("userinfo_missing_id", { rid });
      return createResultRedirect(
        appOrigin,
        next,
        "error",
        "Yandex user id is missing",
      );
    }

    const response = createResultRedirect(appOrigin, next, "success");
    if (!setAppSessionCookie(response, user)) {
      warnYandexAuth("session_secret_missing", { rid });
      return createResultRedirect(
        appOrigin,
        next,
        "error",
        "APP_SESSION_SECRET is not configured",
      );
    }

    logYandexAuth("success", {
      rid,
      hasEmail: Boolean(user.email),
      hasName: Boolean(user.name),
      hasAvatar: Boolean(user.avatarUrl),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yandex OAuth failed";
    warnYandexAuth("callback_failed", {
      rid,
      message: safeAuthError(message),
    });
    return createResultRedirect(appOrigin, next, "error", message);
  }
}
