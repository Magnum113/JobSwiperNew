import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readAppSessionUser } from "@/lib/auth/app-session";
import { getSupabasePublishableKey, getSupabaseUrl } from "./server";

export async function createSupabaseAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes sessions.
        }
      },
    },
  });
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) return user.id;

  const appSessionUser = await readAppSessionUser();
  return appSessionUser?.id ?? null;
}

export async function resolveRequestUserId(
  requestedUserId: string,
): Promise<string> {
  return (await getAuthenticatedUserId()) ?? requestedUserId;
}
