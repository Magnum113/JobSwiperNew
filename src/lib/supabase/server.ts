import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Supabase не настроен: задайте SUPABASE_URL");
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "Supabase не настроен: задайте SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return key;
}

/**
 * Server-side Supabase client (publishable key). Used only from /api routes —
 * the key never reaches the browser. Auth-aware routes resolve the effective
 * user id before calling the query layer.
 */
export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
