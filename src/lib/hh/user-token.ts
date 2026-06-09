import "server-only";
import {
  HH_API_BASE,
  HH_TOKEN_URL,
  HH_USER_AGENT,
  getHhClientId,
  getHhClientSecret,
} from "@/lib/auth/hh";
import {
  getHhConnection,
  saveHhConnection,
  type HhConnection,
} from "@/lib/supabase/queries";

// hh.ru user tokens: access lives ~14 days, the refresh token is SINGLE-USE — a
// refresh returns a brand-new access+refresh pair, and the old refresh token is
// immediately invalidated. So we only refresh when the access token is (near)
// expired and persist the new pair atomically right away.

const REFRESH_SKEW_MS = 60_000; // refresh a minute before expiry

export class HhUserAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HhUserAuthError";
  }
}

interface HhTokenResponse {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  error?: unknown;
  error_description?: unknown;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function readJson(res: Response): Promise<HhTokenResponse | null> {
  try {
    return (await res.json()) as HhTokenResponse;
  } catch {
    return null;
  }
}

/** Exchange an authorization code for a user token (used by the callback). */
export async function exchangeHhCode(
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: number }> {
  const clientId = getHhClientId();
  const clientSecret = getHhClientSecret();
  if (!clientId || !clientSecret) {
    throw new HhUserAuthError("HH_CLIENT_ID / HH_CLIENT_SECRET is not configured");
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
  const data = await readJson(res);
  const accessToken = str(data?.access_token);
  if (!res.ok || !accessToken) {
    throw new HhUserAuthError(
      str(data?.error_description) ?? str(data?.error) ?? `token error ${res.status}`,
    );
  }

  const ttl =
    typeof data?.expires_in === "number" ? data.expires_in * 1000 : 14 * 24 * 3600_000;
  return {
    accessToken,
    refreshToken: str(data?.refresh_token),
    expiresAt: Date.now() + ttl,
  };
}

async function refreshHhToken(conn: HhConnection): Promise<HhConnection> {
  if (!conn.refreshToken) {
    throw new HhUserAuthError("hh.ru session expired (no refresh token)");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: conn.refreshToken,
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
  const data = await readJson(res);
  const accessToken = str(data?.access_token);
  if (!res.ok || !accessToken) {
    throw new HhUserAuthError(
      str(data?.error_description) ?? str(data?.error) ?? `refresh error ${res.status}`,
    );
  }
  const ttl =
    typeof data?.expires_in === "number" ? data.expires_in * 1000 : 14 * 24 * 3600_000;
  return {
    hhUserId: conn.hhUserId,
    accessToken,
    refreshToken: str(data?.refresh_token) ?? conn.refreshToken,
    expiresAt: Date.now() + ttl,
  };
}

/**
 * Returns a valid hh.ru user access token for the account, refreshing + saving a
 * new token pair if the stored one is (about to be) expired. Throws if the user
 * has no hh.ru connection or the refresh failed (caller should prompt re-login).
 */
export async function getValidHhUserToken(userId: string): Promise<string> {
  const conn = await getHhConnection(userId);
  if (!conn) throw new HhUserAuthError("hh.ru is not connected for this account");

  if (conn.expiresAt > Date.now() + REFRESH_SKEW_MS) return conn.accessToken;

  const refreshed = await refreshHhToken(conn);
  await saveHhConnection(userId, refreshed);
  return refreshed.accessToken;
}

/** Authenticated GET against the hh.ru API on behalf of the user. */
export async function hhUserGet<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url.startsWith("http") ? url : `${HH_API_BASE}${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "HH-User-Agent": HH_USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    throw new HhUserAuthError(`hh.ru rejected the user token (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`hh.ru request failed (${res.status})`);
  }
  return (await res.json()) as T;
}
