import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { getAppOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

const YANDEX_SCOPES = "login:info login:email";

function redirectNoStore(url: string | URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function getYandexProvider(): `custom:${string}` {
  const configured = process.env.SUPABASE_YANDEX_PROVIDER_ID?.trim();
  if (!configured) return "custom:yandex";
  return configured.startsWith("custom:")
    ? (configured as `custom:${string}`)
    : `custom:${configured}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appOrigin = getAppOrigin(req);
  const next = url.searchParams.get("next") || "/profile";
  const redirectTo = new URL("/auth/callback", appOrigin);
  redirectTo.searchParams.set("next", next);
  redirectTo.searchParams.set("provider", "yandex");

  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: getYandexProvider(),
    options: {
      redirectTo: redirectTo.toString(),
      scopes: YANDEX_SCOPES,
    },
  });

  if (error || !data.url) {
    const fallback = new URL("/profile", appOrigin);
    fallback.searchParams.set("auth", "error");
    fallback.searchParams.set("provider", "yandex");
    return redirectNoStore(fallback);
  }

  return redirectNoStore(data.url);
}
