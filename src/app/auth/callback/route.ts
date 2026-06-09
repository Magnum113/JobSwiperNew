import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { getAppOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

function redirectNoStore(url: string | URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }
  return value;
}

function safeProvider(value: string | null): string | null {
  return value === "google" || value === "yandex" ? value : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appOrigin = getAppOrigin(req);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const provider = safeProvider(url.searchParams.get("provider"));

  if (code) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const redirectUrl = new URL(next, appOrigin);
    redirectUrl.searchParams.set("auth", error ? "error" : "success");
    if (provider) redirectUrl.searchParams.set("provider", provider);
    return redirectNoStore(redirectUrl);
  }

  const redirectUrl = new URL("/profile", appOrigin);
  redirectUrl.searchParams.set("auth", "error");
  if (provider) redirectUrl.searchParams.set("provider", provider);
  return redirectNoStore(redirectUrl);
}
