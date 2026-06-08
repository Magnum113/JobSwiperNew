"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  SearchX,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { FiltersSheet } from "@/components/filters/filters-sheet";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { VacancyDetailDialog } from "@/components/vacancy/vacancy-detail-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useVacancies } from "@/lib/hooks/use-vacancies";
import { useMatchScores } from "@/lib/hooks/use-match-scores";
import { useAppStore } from "@/lib/store/use-app-store";
import { buildResumeContext } from "@/lib/resume";
import { generateCoverLetter } from "@/lib/cover-letter";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { SwipeDirection } from "@/lib/types";

function DeckSkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="aspect-[3/4.35] w-full animate-pulse rounded-[1.6rem] border border-border/70 bg-card shadow-card" />
      <div className="flex gap-6">
        <div className="size-16 animate-pulse rounded-full bg-muted" />
        <div className="size-16 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const hydrated = useAppStore((s) => s.hydrated);
  const profile = useAppStore((s) => s.profile);
  const filters = useAppStore((s) => s.filters);
  const seen = useAppStore((s) => s.seen);
  const matches = useAppStore((s) => s.matches);
  const liked = useAppStore((s) => s.liked);
  const like = useAppStore((s) => s.like);
  const pass = useAppStore((s) => s.pass);
  const resetSwipes = useAppStore((s) => s.resetSwipes);

  const enabled = hydrated && !!profile;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVacancies(filters, enabled);

  // Flatten + dedupe + drop already-swiped vacancies.
  const deckItems = useMemo(() => {
    const out: HHVacancyItem[] = [];
    const ids = new Set<string>();
    for (const page of data?.pages ?? []) {
      for (const v of page.items) {
        if (ids.has(v.id) || seen[v.id]) continue;
        ids.add(v.id);
        out.push(v);
      }
    }
    return out;
  }, [data, seen]);

  const found = data?.pages?.[0]?.found ?? 0;
  const resumeContext = useMemo(() => buildResumeContext(profile), [profile]);
  const loadingIds = useMatchScores(deckItems, resumeContext, enabled);

  // Keep the deck stocked.
  useEffect(() => {
    if (deckItems.length <= 6 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [deckItems.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [selected, setSelected] = useState<HHVacancyItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSwipe = (vacancy: HHVacancyItem, dir: SwipeDirection) => {
    if (dir === "right") {
      like(vacancy, matches[vacancy.id]);
      generateCoverLetter(vacancy.id);
      toast.success("Добавлено в отклики", {
        description: "ИИ готовит сопроводительное письмо…",
      });
    } else {
      pass(vacancy);
    }
  };

  const openDetails = (vacancy: HHVacancyItem) => {
    setSelected(vacancy);
    setDetailOpen(true);
  };

  /* ----------------------------- Render states ---------------------------- */

  let body: React.ReactNode;

  if (!hydrated) {
    body = <DeckSkeleton />;
  } else if (!profile) {
    body = (
      <EmptyState
        icon={FileText}
        title="Добавьте резюме, чтобы начать"
        description="Вставьте текст резюме в личном кабинете — ИИ определит вашу профессию и подберёт релевантные вакансии с оценкой совместимости."
        action={
          <Button
            className="bg-gradient-brand"
            nativeButton={false}
            render={<Link href="/profile" />}
          >
            Заполнить резюме
          </Button>
        }
      />
    );
  } else if (isLoading) {
    body = <DeckSkeleton />;
  } else if (isError) {
    body = (
      <EmptyState
        icon={AlertTriangle}
        title="Не удалось загрузить вакансии"
        description={
          error instanceof Error ? error.message : "Попробуйте ещё раз."
        }
        action={
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="size-4" />
            Повторить
          </Button>
        }
      />
    );
  } else if (deckItems.length === 0) {
    const stillLoading = isFetchingNextPage || hasNextPage;
    body = stillLoading ? (
      <DeckSkeleton />
    ) : (
      <EmptyState
        icon={SearchX}
        title="Вакансии закончились"
        description="Вы просмотрели все подходящие вакансии. Измените фильтры или начните ленту заново."
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <Button onClick={() => resetSwipes()} variant="outline">
              <RefreshCw className="size-4" />
              Начать заново
            </Button>
            <FiltersSheet />
          </div>
        }
      />
    );
  } else {
    body = (
      <SwipeDeck
        items={deckItems}
        matches={matches}
        loadingIds={loadingIds}
        onSwipe={handleSwipe}
        onDetails={openDetails}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <BrandMark />
        <FiltersSheet />
      </header>

      {/* Subtle status line */}
      {enabled && !isLoading && !isError && deckItems.length > 0 && (
        <div className="px-4 pt-2 text-center sm:pt-3">
          <p className="text-xs text-muted-foreground">
            {found > 0 && (
              <>
                Найдено{" "}
                <span className="font-semibold text-foreground">
                  {found.toLocaleString("ru-RU")}
                </span>{" "}
                вакансий
                {filters.text ? ` по запросу «${filters.text}»` : ""}
                {isFetchingNextPage && " · подгружаем ещё…"}
              </>
            )}
          </p>
        </div>
      )}

      {/* Deck / states */}
      <div className="flex flex-1 items-start justify-center px-4 pb-3 pt-3 sm:py-4">
        <div className="w-full max-w-sm">{body}</div>
      </div>

      <VacancyDetailDialog
        vacancy={selected}
        match={selected ? matches[selected.id] : undefined}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        isLiked={selected ? !!liked[selected.id] : false}
        onLike={(v) => {
          handleSwipe(v, "right");
          setDetailOpen(false);
        }}
      />
    </div>
  );
}
