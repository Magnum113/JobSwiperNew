import "server-only";
import { NextResponse } from "next/server";

// hh.ru applicant OAuth (authorization_code + PKCE). The same OAuth application
// (HH_CLIENT_ID / HH_CLIENT_SECRET) used for the server-side client_credentials
// app token also issues user tokens — hh.ru apps support both grants. The user
// token (14-day access + one-time refresh) is what lets us read the applicant's
// resumes. See architecture.md §5.

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
