import "server-only";
import { promises as fs } from "fs";
import path from "path";

// HH issues an application token via the client_credentials grant. It is
// long-lived and refusing to mint a new one too early ("app token refresh too
// early"), so we cache it in memory AND on disk to survive dev-server restarts.

const TOKEN_URL = "https://api.hh.ru/token";
const UA = "JobSwiper/1.0 (kadimagomedovv@gmail.com)";
const CACHE_FILE = path.join(process.cwd(), ".hh-token.json");
const DEFAULT_TTL = 13 * 24 * 60 * 60 * 1000; // ~13 days

interface TokenData {
  token: string;
  expiresAt: number;
}

let mem: TokenData | null = null;
let inflight: Promise<string> | null = null;

function isValid(d: TokenData | null): d is TokenData {
  return !!d && !!d.token && d.expiresAt > Date.now() + 60_000;
}

async function readCache(): Promise<TokenData | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const j = JSON.parse(raw);
    if (j?.token && typeof j.expiresAt === "number") return j as TokenData;
  } catch {
    // missing or unreadable — ignore
  }
  return null;
}

async function writeCache(d: TokenData): Promise<void> {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(d), "utf8");
  } catch {
    // best-effort; in-memory cache still works
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
      "User-Agent": UA,
    },
    body,
    cache: "no-store",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j?.access_token) {
    throw new Error(j?.error_description ?? `token error ${res.status}`);
  }
  const ttl = typeof j.expires_in === "number" ? j.expires_in * 1000 : DEFAULT_TTL;
  return { token: j.access_token, expiresAt: Date.now() + ttl };
}

/**
 * Returns a valid HH application access token, minting + caching one as needed.
 * Pass `force` to refresh even if the cached token looks valid (used after a 401).
 */
export async function getAppToken(force = false): Promise<string> {
  if (!force && isValid(mem)) return mem.token;

  if (!mem) {
    const cached = await readCache();
    if (cached) mem = cached;
    if (!force && isValid(mem)) return mem.token;
  }

  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const fresh = await fetchToken();
      mem = fresh;
      await writeCache(fresh);
      return fresh.token;
    } catch (err) {
      // Refresh refused (e.g. "too early") but we still hold a token — reuse it.
      if (mem?.token) return mem.token;
      const cached = await readCache();
      if (cached?.token) {
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
