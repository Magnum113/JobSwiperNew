import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;
let cachedAdmin: SupabaseClient | null = null;

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

export function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Supabase admin client is not configured: set SUPABASE_SERVICE_ROLE_KEY",
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

/**
 * Server-only admin client for trusted API routes such as payment webhooks.
 * Never import this from Client Components or expose SUPABASE_SERVICE_ROLE_KEY
 * through NEXT_PUBLIC_* variables.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  cachedAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}
