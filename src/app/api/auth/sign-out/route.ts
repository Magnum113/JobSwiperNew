import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseAuthClient();
  await supabase.auth.signOut();
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
