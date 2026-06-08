"use client";
import { useEffect } from "react";

function fallbackNextPath(pathname: string): string {
  return pathname === "/" ? "/profile" : pathname;
}

export function AuthCodeBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code || window.location.pathname === "/auth/callback") return;

    const next = params.get("next") ?? fallbackNextPath(window.location.pathname);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("code", code);
    callback.searchParams.set("next", next);
    window.location.replace(callback.toString());
  }, []);

  return null;
}
