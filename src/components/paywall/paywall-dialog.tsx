"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Check, LockKeyhole, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/use-app-store";
import { PLANS, PRO_BENEFITS, type Plan } from "@/lib/plans";
import { ANALYTICS_GOALS, trackGoal } from "@/lib/analytics";

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

function HhIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#D6001C" />
      <text
        fill="#fff"
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="12"
        fontWeight="700"
      >
        hh
      </text>
    </svg>
  );
}

export function PaywallDialog() {
  const open = useAppStore((s) => s.paywallOpen);
  const source = useAppStore((s) => s.paywallSource);
  const closePaywall = useAppStore((s) => s.closePaywall);
  const authUser = useAppStore((s) => s.authUser);
  const authChecked = useAppStore((s) => s.authChecked);

  // Default to the recommended (highlighted) pack.
  const [planId, setPlanId] = useState<Plan["id"]>("max");
  const [paying, setPaying] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  useEffect(() => {
    if (!open) return;
    trackGoal(ANALYTICS_GOALS.paywallOpen, {
      source: source ?? "unknown",
    });
  }, [open, source]);

  const handlePay = async () => {
    if (!authChecked) return;
    if (!authUser) {
      closePaywall();
      setAuthDialogOpen(true);
      return;
    }

    setPaying(true);
    trackGoal(ANALYTICS_GOALS.subscriptionCtaClick, {
      plan_id: plan.id,
      price: plan.price,
      source: source ?? "unknown",
    });

    try {
      const res = await fetch("/api/billing/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await res.json().catch(() => null)) as {
        paymentUrl?: string;
        error?: string;
      } | null;

      if (!res.ok || !data?.paymentUrl) {
        throw new Error(data?.error ?? "Не удалось создать платёж");
      }

      window.location.assign(data.paymentUrl);
    } catch (error) {
      setPaying(false);
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать платёж",
      );
    }
  };

  const signInWithGoogle = () => {
    window.location.assign("/api/auth/google?next=/profile");
  };

  const signInWithYandex = () => {
    window.location.assign("/api/auth/yandex?next=/profile");
  };

  const signInWithHh = () => {
    window.location.assign("/api/auth/hh?next=/profile");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && closePaywall()}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[26rem] gap-0 overflow-hidden p-0"
        >
        {/* Hero */}
        <div className="relative bg-gradient-brand px-6 pb-7 pt-7 text-white">
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3 text-white/80 hover:bg-white/15 hover:text-white"
              />
            }
          >
            <X />
            <span className="sr-only">Закрыть</span>
          </DialogClose>

          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/15 shadow-sm ring-1 ring-white/25">
            <Crown className="size-6 fill-white/40" />
          </span>
          <DialogTitle className="mt-3 text-2xl font-extrabold tracking-tight text-white">
            Пакеты лимитов
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/85">
            Купите разовый пакет откликов, анализов вакансий и разборов резюме
            без подписки и автопродления.
          </DialogDescription>
        </div>

        {/* Benefits */}
        <div className="space-y-2.5 px-6 pt-5">
          {PRO_BENEFITS.map((b) => (
            <div key={b} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-sm leading-snug text-foreground/90">{b}</span>
            </div>
          ))}
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-2.5 px-6 pt-5">
          {PLANS.map((p) => {
            const active = p.id === planId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                className={cn(
                  "relative flex flex-col rounded-2xl border-2 p-3.5 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/70 bg-card hover:border-border",
                )}
              >
                {p.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    {p.badge}
                  </span>
                )}
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    ₽
                  </span>
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {p.note}
                </span>
                <span
                  className={cn(
                    "mt-2.5 inline-flex size-5 items-center justify-center self-end rounded-full border-2 transition-colors",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border",
                  )}
                >
                  {active && <Check className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* What you get on the chosen plan */}
        <div className="mx-6 mt-4 flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
          <span>
            <b className="text-foreground">{plan.responses}</b> откликов
          </span>
          <span className="text-border">·</span>
          <span>
            <b className="text-foreground">{plan.analyses}</b> анализов
          </span>
          <span className="text-border">·</span>
          <span>
            <b className="text-foreground">{plan.resumes}</b> резюме
          </span>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-4">
          <Button
            size="lg"
            onClick={handlePay}
            disabled={paying || !authChecked}
            className="h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            <Sparkles className="size-4 fill-white/40" />
            {paying ? "Открываем оплату" : `Купить пакет за ${plan.price} ₽`}
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            Разовая покупка · Безопасная оплата
          </p>
          <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
            Нажимая «Купить пакет», вы соглашаетесь с{" "}
            <Link
              href="/legal/offer"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              офертой
            </Link>
            ,{" "}
            <Link
              href="/legal/privacy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              политикой конфиденциальности
            </Link>
            ,{" "}
            <Link
              href="/legal/personal-data"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              обработкой персональных данных
            </Link>{" "}
            и{" "}
            <Link
              href="/legal/refund"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              условиями возврата
            </Link>
            .
          </p>
        </div>
        </DialogContent>
      </Dialog>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[24rem] gap-0 overflow-hidden p-0"
        >
          <div className="relative bg-gradient-brand px-6 pb-6 pt-6 text-white">
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-3 top-3 text-white/80 hover:bg-white/15 hover:text-white"
                />
              }
            >
              <X />
              <span className="sr-only">Закрыть</span>
            </DialogClose>

            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/15 shadow-sm ring-1 ring-white/25">
              <LockKeyhole className="size-6" />
            </span>
            <DialogTitle className="mt-3 text-xl font-extrabold tracking-tight text-white">
              Войдите, чтобы купить пакет
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-white/85">
              Без авторизации покупка недоступна: пакет лимитов должен
              привязаться к вашему аккаунту.
            </DialogDescription>
          </div>

          <div className="space-y-3 px-6 py-5">
            <Button
              variant="outline"
              className="h-11 w-full justify-center gap-2 rounded-xl"
              onClick={signInWithGoogle}
            >
              <GoogleIcon />
              Войти через Google
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full justify-center gap-2 rounded-xl"
              onClick={signInWithYandex}
            >
              <YandexIcon />
              Войти через Яндекс
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full justify-center gap-2 rounded-xl"
              onClick={signInWithHh}
            >
              <HhIcon />
              Войти через hh.ru
            </Button>
            <p className="px-1 text-center text-xs leading-5 text-muted-foreground">
              После входа вернитесь к покупке пакета в личном кабинете.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
