"use client";
import { Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/use-app-store";
import { PRO_BENEFITS } from "@/lib/plans";

/** Subscription upsell shown in the profile (личный кабинет). */
export function UpgradeCard() {
  const openPaywall = useAppStore((s) => s.openPaywall);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-3 bg-gradient-brand px-5 py-4 text-white">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
          <Crown className="size-5 fill-white/40" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-extrabold tracking-tight">JobSwiper Pro</p>
          <p className="truncate text-xs text-white/85">
            Текущий план: Бесплатный
          </p>
        </div>
      </div>

      <div className="space-y-2.5 px-5 py-4">
        {PRO_BENEFITS.slice(0, 3).map((b) => (
          <div key={b} className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span className="text-sm leading-snug text-foreground/90">{b}</span>
          </div>
        ))}

        <Button
          onClick={() => openPaywall("profile")}
          className="mt-2 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95"
        >
          <Crown className="size-4 fill-white/40" />
          Оформить подписку
        </Button>
      </div>
    </div>
  );
}
