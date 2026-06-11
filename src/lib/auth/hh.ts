import "server-only";
import { NextResponse } from "next/server";

// hh.ru OAuth (authorization_code + PKCE) — used purely as a SIGN-IN method.
// The same OAuth application (HH_CLIENT_ID / HH_CLIENT_SECRET) that issues the
// server-side client_credentials app token also issues user tokens. We exchange
// the code for a short-lived user token only to read `GET /me` (identity) and
// then drop it — no token storage, no resume access. See ARCHITECTURE.md §5.

export const HH_AUTH_STATE_COOKIE = "jobswiper-hh-state";
export const HH_AUTH_VERIFIER_COOKIE = "jobswiper-hh-verifier";
export const HH_AUTH_NEXT_COOKIE = "jobswiper-hh-next";
export const HH_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

export const HH_AUTHORIZE_URL = "https://hh.ru/oauth/authorize";
export const HH_TOKEN_URL = "https://api.hh.ru/token";
export const HH_API_BASE = "https://api.hh.ru";

// hh.ru requires a descriptive User-Agent header (see lib/hh/client.ts).
export const HH_USER_AGENT = "JobSwiper/1.0 (kadimagomedovv@gmail.com)";

export function getHhClientId(): string | null {
  return process.env.HH_CLIENT_ID?.trim() || null;
}

export function getHhClientSecret(): string | null {
  return process.env.HH_CLIENT_SECRET?.trim() || null;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }
  return value;
}

export function safeAuthError(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, 180) : "hh.ru OAuth failed";
}

export function redirectNoStore(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function setHhTempCookie(
  response: NextResponse,
  name: string,
  value: string,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: HH_AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearHhTempCookies(response: NextResponse) {
  for (const name of [
    HH_AUTH_STATE_COOKIE,
    HH_AUTH_VERIFIER_COOKIE,
    HH_AUTH_NEXT_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }
}

export function logHhAuth(event: string, details: Record<string, unknown> = {}) {
  console.info("jobswiper_hh_auth", { event, ...details });
}

export function warnHhAuth(event: string, details: Record<string, unknown> = {}) {
  console.warn("jobswiper_hh_auth", { event, ...details });
}

/* ----------------------- token exchange + identity ------------------------ */

export class HhAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HhAuthError";
  }
}

/** `GET /me` — only the identity fields sign-in needs. */
export interface HhMe {
  id?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Exchanges an authorization code for a short-lived hh.ru user access token.
 * The token is used once (to read `/me`) and discarded — we never store it.
 */
export async function exchangeHhCodeForToken(
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<string> {
  const clientId = getHhClientId();
  const clientSecret = getHhClientSecret();
  if (!clientId || !clientSecret) {
    throw new HhAuthError("HH_CLIENT_ID / HH_CLIENT_SECRET is not configured");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    code_verifier: verifier,
  });

  const res = await fetch(HH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "HH-User-Agent": HH_USER_AGENT,
    },
    body,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as
    | { access_token?: unknown; error?: unknown; error_description?: unknown }
    | null;
  const accessToken = str(data?.access_token);
  if (!res.ok || !accessToken) {
    throw new HhAuthError(
      str(data?.error_description) ?? str(data?.error) ?? `token error ${res.status}`,
    );
  }
  return accessToken;
}

/** Fetches the signed-in hh.ru user's identity. */
export async function fetchHhMe(accessToken: string): Promise<HhMe> {
  const res = await fetch(`${HH_API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "HH-User-Agent": HH_USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new HhAuthError(`hh.ru /me failed (${res.status})`);
  return (await res.json()) as HhMe;
}
