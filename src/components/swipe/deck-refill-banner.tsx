"use client";
import { Sparkles, Crown, SearchX, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiltersSheet } from "@/components/filters/filters-sheet";
import { cn } from "@/lib/utils";
import type { RefillVariant } from "@/lib/deck-supply";

interface DeckRefillBannerProps {
  variant: RefillVariant;
  /** How many weaker (below-threshold) cards are still swipeable below. */
  weakRemaining: number;
  loading?: boolean;
  onLoadMore: () => void;
  onReset: () => void;
  onPro: () => void;
}

export function DeckRefillBanner({
  variant,
  weakRemaining,
  loading,
  onLoadMore,
  onReset,
  onPro,
}: DeckRefillBannerProps) {
  const hint =
    weakRemaining > 0
      ? `Ниже ещё ${weakRemaining} менее подходящих — их можно листать как обычно.`
      : null;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card/80 p-4 text-center shadow-card backdrop-blur",
      )}
    >
      {variant === "loadMore" && (
        <>
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Самые подходящие закончились
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Поищем дальше — загрузим и оценим новую партию вакансий.
          </p>
          <Button
            onClick={onLoadMore}
            disabled={loading}
            className="mt-3 w-full bg-gradient-brand"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Загрузить ещё подходящие
          </Button>
        </>
      )}

      {variant === "outOfQuota" && (
        <>
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Crown className="size-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Лимит оценки совместимости исчерпан
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            На бесплатном тарифе мы оценили максимум вакансий. Откройте Pro, чтобы
            и дальше видеть «самые подходящие — первыми».
          </p>
          <Button onClick={onPro} className="mt-3 w-full bg-gradient-brand">
            <Crown className="size-4 fill-white/40" />
            Открыть Pro
          </Button>
        </>
      )}

      {variant === "exhausted" && (
        <>
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Подходящие вакансии закончились
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Вы пролистали всё, что нашлось по текущим фильтрам. Измените их или
            начните ленту заново.
          </p>
          <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <FiltersSheet />
            <Button onClick={onReset} variant="outline" className="gap-2">
              <RotateCcw className="size-4" />
              Начать заново
            </Button>
          </div>
        </>
      )}

      {hint && <p className="mt-3 text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
