"use client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/db-sync";
import { useAppStore } from "@/lib/store/use-app-store";

interface AuthIssue {
  title: string;
  detail?: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function YandexIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#FC3F1D" />
      <text
        fill="#fff"
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="15"
        fontWeight="700"
      >
        Я
      </text>
    </svg>
  );
}

export function AuthButtons() {
  const [signingOut, setSigningOut] = useState(false);
  const [authIssue, setAuthIssue] = useState<AuthIssue | null>(null);
  const user = useAppStore((s) => s.authUser);
  const authChecked = useAppStore((s) => s.authChecked);
  const setAuthUser = useAppStore((s) => s.setAuthUser);
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const provider = params.get("provider");
    const directOauthError =
      params.get("error_description") ?? params.get("error");
    const authError = params.get("auth_error") ?? directOauthError;
    const authStatus = auth ?? (directOauthError ? "error" : null);
    const providerName = provider === "yandex" ? "Яндекс" : "Google";
    if (authStatus === "success") {
      toast.success(`Вы вошли через ${providerName}`);
      getAuthUser().then((freshUser) => {
        if (cancelled) return;
        setAuthUser(freshUser);
        setAuthChecked(true);
        if (!freshUser) {
          setAuthIssue({
            title: "Сессия аккаунта не появилась",
            detail:
              "OAuth вернул success, но Supabase session endpoint всё ещё отдаёт null.",
          });
          toast.error(
            "Вход прошёл, но сессия аккаунта не появилась. Попробуйте войти ещё раз.",
          );
        } else {
          setAuthIssue(null);
        }
      });
      window.history.replaceState(null, "", window.location.pathname);
    } else if (authStatus === "error") {
      setAuthIssue({
        title: `Не удалось войти через ${providerName}`,
        detail: authError ?? undefined,
      });
      toast.error(
        authError
          ? `Не удалось войти через ${providerName}: ${authError}`
          : `Не удалось войти через ${providerName}`,
      );
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      cancelled = true;
    };
  }, [setAuthChecked, setAuthUser]);

  const signInWithGoogle = () => {
    window.location.assign("/api/auth/google?next=/profile");
  };

  const signInWithYandex = () => {
    window.location.assign("/api/auth/yandex?next=/profile");
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      setAuthUser(null);
      toast.success("Вы вышли из аккаунта");
      window.location.reload();
    } catch {
      toast.error("Не удалось выйти из аккаунта");
      setSigningOut(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-11 justify-center gap-2 rounded-xl"
          disabled
        >
          <GoogleIcon />
          Проверяем аккаунт
        </Button>
        <Button
          variant="outline"
          className="h-11 justify-center gap-2 rounded-xl"
          disabled
        >
          <YandexIcon />
          Войти через Яндекс
        </Button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {user.name || user.email || "Аккаунт"}
          </p>
          {user.email ? (
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          className="h-10 justify-center gap-2 rounded-xl sm:w-auto"
          onClick={signOut}
          disabled={signingOut}
        >
          <LogOut className="size-4" />
          {signingOut ? "Выходим" : "Выйти"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {authIssue && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{authIssue.title}</p>
          {authIssue.detail ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {authIssue.detail}
            </p>
          ) : null}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-11 justify-center gap-2 rounded-xl"
          onClick={signInWithGoogle}
        >
          <GoogleIcon />
          Войти через Google
        </Button>
        <Button
          variant="outline"
          className="h-11 justify-center gap-2 rounded-xl"
          onClick={signInWithYandex}
        >
          <YandexIcon />
          Войти через Яндекс
        </Button>
      </div>
    </div>
  );
}
