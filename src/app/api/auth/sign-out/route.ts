import { NextResponse } from "next/server";
import { clearAppSessionCookie } from "@/lib/auth/app-session";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseAuthClient();
  await supabase.auth.signOut();
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
  clearAppSessionCookie(response);
  return response;
}
