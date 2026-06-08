"use client";
import { useState } from "react";
import { Crown, Check, Sparkles, X } from "lucide-react";
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

export function PaywallDialog() {
  const open = useAppStore((s) => s.paywallOpen);
  const closePaywall = useAppStore((s) => s.closePaywall);
  const proBonusClaimed = useAppStore((s) => s.proBonusClaimed);
  const claimProBonus = useAppStore((s) => s.claimProBonus);

  // Default to the recommended (highlighted) plan.
  const [planId, setPlanId] = useState<Plan["id"]>("month");

  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0];

  const handlePay = () => {
    if (!proBonusClaimed) {
      claimProBonus();
      toast.success("Оплата скоро откроется", {
        description:
          "Сервис в активной разработке — платежи подключаем совсем скоро. А пока дарим вам 50 откликов бесплатно 🎁",
        duration: 7000,
      });
    } else {
      toast("Оплата скоро откроется", {
        description:
          "Мы уже подключаем платёжную систему. Загляните чуть позже — всё будет готово.",
        duration: 6000,
      });
    }
    closePaywall();
  };

  return (
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
            JobSwiper Pro
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-white/85">
            Откликайся быстрее и попадай в топ: ИИ пишет письма и находит лучшие
            вакансии под тебя.
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
                    ₽ {p.period}
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
            className="h-12 w-full rounded-xl bg-gradient-brand text-base font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            <Sparkles className="size-4 fill-white/40" />
            Оформить за {plan.price} ₽
          </Button>
          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            Отмена в любой момент · Безопасная оплата
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
