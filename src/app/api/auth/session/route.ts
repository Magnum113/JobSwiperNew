import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json(
    {
      user: user
        ? {
            id: user.id,
            email: user.email ?? null,
            name:
              typeof user.user_metadata?.name === "string"
                ? user.user_metadata.name
                : null,
            avatarUrl:
              typeof user.user_metadata?.avatar_url === "string"
                ? user.user_metadata.avatar_url
                : null,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
