import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { getAppOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

function redirectNoStore(url: string | URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appOrigin = getAppOrigin(req);
  const next = url.searchParams.get("next") || "/profile";
  const redirectTo = new URL("/auth/callback", appOrigin);
  redirectTo.searchParams.set("next", next);

  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error || !data.url) {
    const fallback = new URL("/profile", appOrigin);
    fallback.searchParams.set("auth", "error");
    return redirectNoStore(fallback);
  }

  return redirectNoStore(data.url);
}
