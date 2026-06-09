import "server-only";
import { NextResponse } from "next/server";

export const YANDEX_AUTH_STATE_COOKIE = "jobswiper-yandex-state";
export const YANDEX_AUTH_VERIFIER_COOKIE = "jobswiper-yandex-verifier";
export const YANDEX_AUTH_NEXT_COOKIE = "jobswiper-yandex-next";
export const YANDEX_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

const DEFAULT_YANDEX_CLIENT_ID = "da7009c556644993a1e2e670cf6a41db";

export function getYandexClientId(): string {
  return (
    process.env.YANDEX_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID?.trim() ||
    DEFAULT_YANDEX_CLIENT_ID
  );
}

export function getYandexClientSecret(): string | null {
  return process.env.YANDEX_CLIENT_SECRET?.trim() || null;
}

export function getYandexScope(): string | null {
  const scope = process.env.YANDEX_SCOPE?.trim();
  return scope || null;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }
  return value;
}

export function safeAuthError(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, 180) : "Yandex OAuth failed";
}

export function redirectNoStore(url: string | URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function setYandexTempCookie(
  response: NextResponse,
  name: string,
  value: string,
) {
  response.cookies.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YANDEX_AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearYandexTempCookies(response: NextResponse) {
  for (const name of [
    YANDEX_AUTH_STATE_COOKIE,
    YANDEX_AUTH_VERIFIER_COOKIE,
    YANDEX_AUTH_NEXT_COOKIE,
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

export function logYandexAuth(
  event: string,
  details: Record<string, unknown> = {},
) {
  console.info(
    `jobswiper_yandex_auth ${JSON.stringify({
      event,
      ...details,
    })}`,
  );
}

export function warnYandexAuth(
  event: string,
  details: Record<string, unknown> = {},
) {
  console.warn(
    `jobswiper_yandex_auth ${JSON.stringify({
      event,
      ...details,
    })}`,
  );
}
