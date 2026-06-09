import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { readAppSessionUser } from "@/lib/auth/app-session";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdentityData = Record<string, unknown>;

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(values: unknown[]): string | null {
  for (const value of values) {
    const text = stringValue(value);
    if (text) return text;
  }
  return null;
}

function firstIdentityData(user: User): IdentityData {
  return (user.identities ?? []).find((identity) => identity.identity_data)
    ?.identity_data ?? {};
}

function identityEmail(data: IdentityData): string | null {
  const emails = Array.isArray(data.emails) ? data.emails : [];
  return firstString([data.email, data.default_email, ...emails]);
}

function identityName(data: IdentityData): string | null {
  return firstString([
    data.name,
    data.full_name,
    data.real_name,
    data.display_name,
    data.login,
    data.preferred_username,
  ]);
}

function identityAvatarUrl(data: IdentityData): string | null {
  const direct = firstString([data.avatar_url, data.picture]);
  if (direct) return direct;

  const yandexAvatarId = stringValue(data.default_avatar_id);
  return yandexAvatarId
    ? `https://avatars.yandex.net/get-yapic/${yandexAvatarId}/islands-200`
    : null;
}

export async function GET() {
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const identityData = user ? firstIdentityData(user) : {};
  const appSessionUser = user ? null : await readAppSessionUser();

  return NextResponse.json(
    {
      user: user
        ? {
            id: user.id,
            email:
              user.email ??
              stringValue(user.user_metadata?.email) ??
              identityEmail(identityData),
            name:
              firstString([
                user.user_metadata?.name,
                user.user_metadata?.full_name,
                identityName(identityData),
              ]) ?? null,
            avatarUrl:
              firstString([
                user.user_metadata?.avatar_url,
                user.user_metadata?.picture,
                identityAvatarUrl(identityData),
              ]) ?? null,
          }
        : appSessionUser,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
