"use client";
import { Crown, Send, Target, FileText, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/use-app-store";
import { useLimits } from "@/lib/hooks/use-limits";
import { cn } from "@/lib/utils";

function LimitRow({
  icon: Icon,
  label,
  remaining,
  limit,
}: {
  icon: LucideIcon;
  label: string;
  remaining: number;
  limit: number;
}) {
  const used = Math.max(0, limit - remaining);
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const empty = remaining <= 0;
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-lg",
            empty ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-medium">{label}</span>
        <span
          className={cn(
            "ml-auto text-sm tabular-nums",
            empty ? "font-semibold text-destructive" : "text-muted-foreground",
          )}
        >
          осталось <b className="text-foreground">{remaining}</b> из {limit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            empty ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

/** Limit block in the profile: current remaining limits + purchase CTA. */
export function UpgradeCard() {
  const openPaywall = useAppStore((s) => s.openPaywall);
  const { limits, remaining } = useLimits();

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-3 bg-gradient-brand px-5 py-4 text-white">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
          <Crown className="size-5 fill-white/40" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-extrabold tracking-tight">Пакеты лимитов</p>
          <p className="truncate text-xs text-white/85">
            Текущий план: Бесплатный
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Остаток лимитов
        </p>

        <LimitRow
          icon={Send}
          label="Отклики"
          remaining={remaining.responses}
          limit={limits.responses}
        />
        <LimitRow
          icon={Target}
          label="Анализ вакансий"
          remaining={remaining.analyses}
          limit={limits.analyses}
        />
        <LimitRow
          icon={FileText}
          label="Анализ резюме"
          remaining={remaining.resumes}
          limit={limits.resumes}
        />

        <Button
          onClick={() => openPaywall("profile")}
          className="mt-1 h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95"
        >
          <Crown className="size-4 fill-white/40" />
          Увеличить лимиты
        </Button>
      </div>
    </div>
  );
}
