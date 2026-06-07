"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
      <path
        fill="#fff"
        d="M13.3 6.4h-1.2c-1.9 0-3 1-3 2.7 0 1.4.6 2.1 1.9 3l1 .7-2.9 4.4H9l2.6-3.9c-1.5-.8-2.4-1.7-2.4-3.6 0-2.4 1.6-3.9 4.1-3.9h2v11.4h-1.6V6.4Z"
      />
    </svg>
  );
}

export function AuthButtons() {
  const notify = (provider: string) =>
    toast.info(`Вход через ${provider}`, {
      description: "Настоящая авторизация появится в следующей версии.",
    });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button
        variant="outline"
        className="h-11 justify-center gap-2 rounded-xl"
        onClick={() => notify("Google")}
      >
        <GoogleIcon />
        Войти через Google
      </Button>
      <Button
        variant="outline"
        className="h-11 justify-center gap-2 rounded-xl"
        onClick={() => notify("Яндекс")}
      >
        <YandexIcon />
        Войти через Яндекс
      </Button>
    </div>
  );
}
