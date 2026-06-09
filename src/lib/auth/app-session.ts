import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export type AppAuthProvider = "yandex" | "hh";

export interface AppAuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  provider: AppAuthProvider;
}

interface SessionPayload {
  v: 1;
  exp: number;
  user: AppAuthUser;
}

const SESSION_COOKIE = "jobswiper-app-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function base64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64");
}

function getSessionSecret(): string | null {
  return (
    process.env.APP_SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.HH_CLIENT_SECRET ??
    process.env.AITUNNEL_API_KEY ??
    null
  );
}

function sign(payload: string): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  return base64Url(createHmac("sha256", secret).update(payload).digest());
}

function verifySignature(payload: string, signature: string): boolean {
  const expected = sign(payload);
  if (!expected) return false;

  const actualBuffer = fromBase64Url(signature);
  const expectedBuffer = fromBase64Url(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function createCookieValue(user: AppAuthUser): string | null {
  const payload: SessionPayload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    user,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return signature ? `${encodedPayload}.${signature}` : null;
}

function isAppAuthUser(value: unknown): value is AppAuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AppAuthUser>;
  return (
    typeof user.id === "string" &&
    (user.email === null || typeof user.email === "string") &&
    (user.name === null || typeof user.name === "string") &&
    (user.avatarUrl === null || typeof user.avatarUrl === "string") &&
    (user.provider === "yandex" || user.provider === "hh")
  );
}

export async function readAppSessionUser(): Promise<AppAuthUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature) return null;
  if (!verifySignature(encodedPayload, signature)) return null;

  try {
    const payload = JSON.parse(
      fromBase64Url(encodedPayload).toString("utf8"),
    ) as Partial<SessionPayload>;
    if (payload.v !== 1 || typeof payload.exp !== "number") return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return isAppAuthUser(payload.user) ? payload.user : null;
  } catch {
    return null;
  }
}

export function setAppSessionCookie(
  response: NextResponse,
  user: AppAuthUser,
): boolean {
  const value = createCookieValue(user);
  if (!value) return false;

  response.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return true;
}

export function clearAppSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function stableProviderUserId(provider: AppAuthProvider, id: string) {
  const hash = createHash("sha256").update(`${provider}:${id}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
