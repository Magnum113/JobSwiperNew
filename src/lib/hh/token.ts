import "server-only";
import { getSupabase } from "@/lib/supabase/server";

// HH issues an application token via the client_credentials grant. It is
// long-lived and refuses to mint a new one too early ("app token refresh too
// early"), so we cache it in memory AND in Supabase. The DB cache survives
// dev-server restarts and is shared across serverless instances (on disk it
// would not be — Vercel's filesystem is ephemeral and per-instance).

const TOKEN_URL = "https://api.hh.ru/token";
const UA = "JobSwiper/1.0 (kadimagomedovv@gmail.com)";
// Single row keyed by provider in public.app_tokens.
const CACHE_ID = "hh";
const DEFAULT_TTL = 13 * 24 * 60 * 60 * 1000; // ~13 days
const TOKEN_RETRY_COOLDOWN = 5 * 60 * 1000;

interface TokenData {
  token: string;
  expiresAt: number;
}

let mem: TokenData | null = null;
let inflight: Promise<string> | null = null;
let nextTokenAttemptAt = 0;

class TokenRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "TokenRequestError";
  }
}

function isValid(d: TokenData | null): d is TokenData {
  return !!d && !!d.token && d.expiresAt > Date.now() + 60_000;
}

async function readCache(): Promise<TokenData | null> {
  try {
    const { data } = await getSupabase()
      .from("app_tokens")
      .select("token, expires_at")
      .eq("id", CACHE_ID)
      .maybeSingle();
    if (data?.token && data.expires_at) {
      return { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
    }
  } catch {
    // missing or unreachable — ignore
  }
  return null;
}

async function writeCache(d: TokenData): Promise<void> {
  try {
    await getSupabase().from("app_tokens").upsert(
      {
        id: CACHE_ID,
        token: d.token,
        expires_at: new Date(d.expiresAt).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // best-effort; in-memory cache still works
  }
}

async function readCooldown(): Promise<number> {
  if (nextTokenAttemptAt > Date.now()) return nextTokenAttemptAt;
  try {
    const { data } = await getSupabase()
      .from("app_tokens")
      .select("cooldown_until")
      .eq("id", CACHE_ID)
      .maybeSingle();
    if (data?.cooldown_until) {
      nextTokenAttemptAt = new Date(data.cooldown_until).getTime();
      return nextTokenAttemptAt;
    }
  } catch {
    // missing or unreachable — ignore
  }
  return 0;
}

async function writeCooldown(nextAttemptAt: number): Promise<void> {
  nextTokenAttemptAt = nextAttemptAt;
  try {
    await getSupabase().from("app_tokens").upsert(
      {
        id: CACHE_ID,
        cooldown_until: new Date(nextAttemptAt).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch {
    // best-effort; in-memory cooldown still works
  }
}

async function clearCooldown(): Promise<void> {
  nextTokenAttemptAt = 0;
  try {
    await getSupabase()
      .from("app_tokens")
      .update({ cooldown_until: null, updated_at: new Date().toISOString() })
      .eq("id", CACHE_ID);
  } catch {
    // best-effort
  }
}

export async function invalidateAppToken(token?: string): Promise<void> {
  if (!token || mem?.token === token) mem = null;
  try {
    const cached = await readCache();
    if (!token || cached?.token === token) {
      // Drop only the token; preserve any active cooldown.
      await getSupabase()
        .from("app_tokens")
        .update({ token: null, expires_at: null, updated_at: new Date().toISOString() })
        .eq("id", CACHE_ID);
    }
  } catch {
    // best-effort; a fresh token can still be kept in memory
  }
}

async function fetchToken(): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.HH_CLIENT_ID ?? "",
    client_secret: process.env.HH_CLIENT_SECRET ?? "",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "HH-User-Agent": UA,
    },
    body,
    cache: "no-store",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.access_token) {
    throw new TokenRequestError(
      j?.error_description ?? `token error ${res.status}`,
      j?.error,
    );
  }
  const ttl = typeof j.expires_in === "number" ? j.expires_in * 1000 : DEFAULT_TTL;
  return { token: j.access_token, expiresAt: Date.now() + ttl };
}

/**
 * Returns a valid HH application access token, minting + caching one as needed.
 * Pass `force` to refresh even if the cached token looks valid (used after a 401).
 */
export async function getAppToken(
  force = false,
  options: { allowStaleFallback?: boolean } = {},
): Promise<string> {
  const allowStaleFallback = options.allowStaleFallback ?? true;
  if (!force && isValid(mem)) return mem.token;

  if (!mem) {
    const cached = await readCache();
    if (cached) mem = cached;
    if (!force && isValid(mem)) return mem.token;
  }

  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const cooldownUntil = await readCooldown();
      if (Date.now() < cooldownUntil) {
        throw new TokenRequestError("app token refresh cooldown", "forbidden");
      }
      const fresh = await fetchToken();
      await clearCooldown();
      mem = fresh;
      await writeCache(fresh);
      return fresh.token;
    } catch (err) {
      if (
        err instanceof TokenRequestError &&
        err.code === "forbidden" &&
        err.message.includes("too early")
      ) {
        await writeCooldown(Date.now() + TOKEN_RETRY_COOLDOWN);
      }
      // Refresh refused (e.g. "too early") but we still hold a token — reuse it.
      if (allowStaleFallback && mem?.token) return mem.token;
      const cached = await readCache();
      if (allowStaleFallback && cached?.token) {
        mem = cached;
        return cached.token;
      }
      throw err;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
