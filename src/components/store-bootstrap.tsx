"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store/use-app-store";
import {
  getAuthUser,
  getOrCreateUserId,
  mergeAnonymousState,
  pullState,
} from "@/lib/db-sync";

/**
 * Loads the user's data from Supabase into the store on first mount. The only
 * thing read from localStorage is the anonymous device id.
 */
export function StoreBootstrap() {
  const setUserId = useAppStore((s) => s.setUserId);
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);
  const hydrateFromServer = useAppStore((s) => s.hydrateFromServer);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const anonymousId = getOrCreateUserId();
      const user = await getAuthUser();
      const id = user?.id ?? anonymousId;
      if (user && user.id !== anonymousId) {
        await mergeAnonymousState(anonymousId);
      }
      if (!active) return;
      setAuthUser(user);
      setAuthChecked(true);
      setUserId(id);
      const state = await pullState(id);
      if (active && state) hydrateFromServer(state);
    }
    bootstrap()
      .catch((error) => {
        console.warn("store-bootstrap error", error);
      })
      .finally(() => {
        if (active) {
          setAuthChecked(true);
          setHydrated(true);
        }
      });
    return () => {
      active = false;
    };
  }, [setUserId, setAuthUser, setAuthChecked, hydrateFromServer, setHydrated]);

  return null;
}
