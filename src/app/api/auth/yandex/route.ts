import { createHash, randomBytes } from "crypto";
import {
  getYandexClientId,
  getYandexScope,
  logYandexAuth,
  redirectNoStore,
  safeNextPath,
  setYandexTempCookie,
  YANDEX_AUTH_NEXT_COOKIE,
  YANDEX_AUTH_STATE_COOKIE,
  YANDEX_AUTH_VERIFIER_COOKIE,
} from "@/lib/auth/yandex";
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
  const redirectUri = new URL("/api/auth/yandex/callback", appOrigin);
  const state = base64Url(randomBytes(32));
  const verifier = createCodeVerifier();
  const authorizeUrl = new URL("https://oauth.yandex.ru/authorize");

  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", getYandexClientId());
  authorizeUrl.searchParams.set("redirect_uri", redirectUri.toString());
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", createCodeChallenge(verifier));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const scope = getYandexScope();
  if (scope) authorizeUrl.searchParams.set("scope", scope);

  const response = redirectNoStore(authorizeUrl);
  setYandexTempCookie(response, YANDEX_AUTH_STATE_COOKIE, state);
  setYandexTempCookie(response, YANDEX_AUTH_VERIFIER_COOKIE, verifier);
  setYandexTempCookie(response, YANDEX_AUTH_NEXT_COOKIE, next);

  logYandexAuth("start", {
    next,
    redirectUri: redirectUri.toString(),
    hasScopeOverride: Boolean(scope),
  });

  return response;
}
