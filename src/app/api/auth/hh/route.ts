import { createHash, randomBytes } from "crypto";
import {
  HH_AUTHORIZE_URL,
  HH_AUTH_NEXT_COOKIE,
  HH_AUTH_STATE_COOKIE,
  HH_AUTH_VERIFIER_COOKIE,
  getHhClientId,
  logHhAuth,
  redirectNoStore,
  safeNextPath,
  setHhTempCookie,
  warnHhAuth,
} from "@/lib/auth/hh";
import { getAppOrigin } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base64Url(input: Buffer): string {
  return input
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function createCodeVerifier(): string {
  return base64Url(randomBytes(48));
}

function createCodeChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest());
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appOrigin = getAppOrigin(req);
  const next = safeNextPath(url.searchParams.get("next"));
  const clientId = getHhClientId();

  if (!clientId) {
    warnHhAuth("missing_client_id");
    const fallback = new URL(next, appOrigin);
    fallback.searchParams.set("auth", "error");
    fallback.searchParams.set("provider", "hh");
    fallback.searchParams.set("auth_error", "HH_CLIENT_ID is not configured");
    return redirectNoStore(fallback);
  }

  const redirectUri = new URL("/api/auth/hh/callback", appOrigin);
  const state = base64Url(randomBytes(32));
  const verifier = createCodeVerifier();

  const authorizeUrl = new URL(HH_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri.toString());
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", createCodeChallenge(verifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = redirectNoStore(authorizeUrl);
  setHhTempCookie(response, HH_AUTH_STATE_COOKIE, state);
  setHhTempCookie(response, HH_AUTH_VERIFIER_COOKIE, verifier);
  setHhTempCookie(response, HH_AUTH_NEXT_COOKIE, next);

  logHhAuth("start", { next, redirectUri: redirectUri.toString() });

  return response;
}
