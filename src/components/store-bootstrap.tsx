"use client";
import { useEffect } from "react";
import { useAppStore } from "@/lib/store/use-app-store";
import { getOrCreateUserId, pullState } from "@/lib/db-sync";

/**
 * Loads the user's data from Supabase into the store on first mount. The only
 * thing read from localStorage is the anonymous device id.
 */
export function StoreBootstrap() {
  const setUserId = useAppStore((s) => s.setUserId);
  const hydrateFromServer = useAppStore((s) => s.hydrateFromServer);
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    let active = true;
    const id = getOrCreateUserId();
    setUserId(id);
    pullState(id)
      .then((state) => {
        if (active && state) hydrateFromServer(state);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [setUserId, hydrateFromServer, setHydrated]);

  return null;
}
