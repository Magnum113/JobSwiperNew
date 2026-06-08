import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const redirectUrl = new URL(next, url.origin);
    redirectUrl.searchParams.set("auth", error ? "error" : "success");
    return redirectNoStore(redirectUrl);
  }

  const redirectUrl = new URL("/profile", url.origin);
  redirectUrl.searchParams.set("auth", "error");
  return redirectNoStore(redirectUrl);
}
