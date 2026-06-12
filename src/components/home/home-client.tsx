"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  SearchX,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { GuestHome } from "@/components/landing/guest-home";
import { ProButton } from "@/components/paywall/pro-button";
import { FiltersSheet } from "@/components/filters/filters-sheet";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { DeckRefillBanner } from "@/components/swipe/deck-refill-banner";
import { VacancyInsights } from "@/components/swipe/vacancy-insights";
import { VacancyDetailDialog } from "@/components/vacancy/vacancy-detail-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useVacancies } from "@/lib/hooks/use-vacancies";
import { useMatchScores } from "@/lib/hooks/use-match-scores";
import { useLimits } from "@/lib/hooks/use-limits";
import { useAppStore } from "@/lib/store/use-app-store";
import { buildResumeContext } from "@/lib/resume";
import { generateCoverLetter } from "@/lib/cover-letter";
import { ANALYTICS_GOALS, trackGoal } from "@/lib/analytics";
import {
  countSupply,
  decidePrefetch,
  pickRefillVariant,
  type RefillVariant,
} from "@/lib/deck-supply";
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

const MATCH_TIERS = [
  { color: "#10b981", label: "Отличное", range: "85+" },
  { color: "#22c55e", label: "Хорошее", range: "70+" },
  { color: "#f59e0b", label: "Среднее", range: "50+" },
  { color: "#fb923c", label: "Слабое", range: "30+" },
  { color: "#f43f5e", label: "Низкое", range: "" },
] as const;

/** Desktop-only legend explaining the match-ring colors below the deck. */
function MatchLegend() {
  return (
    <div className="mt-7 hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 lg:flex">
      <span className="text-xs font-medium text-muted-foreground">
        Совпадение:
      </span>
      {MATCH_TIERS.map((tier) => (
        <span
          key={tier.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: tier.color }}
          />
          {tier.label}
          {tier.range && ` · ${tier.range}`}
        </span>
      ))}
    </div>
  );
}

export default function HomeClient() {
  const hydrated = useAppStore((s) => s.hydrated);
  const authUser = useAppStore((s) => s.authUser);
  const authChecked = useAppStore((s) => s.authChecked);
  const profile = useAppStore((s) => s.profile);
  const filters = useAppStore((s) => s.filters);
  const seen = useAppStore((s) => s.seen);
  const matches = useAppStore((s) => s.matches);
  const liked = useAppStore((s) => s.liked);
  const like = useAppStore((s) => s.like);
  const pass = useAppStore((s) => s.pass);
  const resetSwipes = useAppStore((s) => s.resetSwipes);
  const consumeResponse = useAppStore((s) => s.consumeResponse);
  const openLimitDialog = useAppStore((s) => s.openLimitDialog);
  const openPaywall = useAppStore((s) => s.openPaywall);
  const { remaining } = useLimits();
  const feedLoadedKeyRef = useRef<string | null>(null);
  const feedErrorKeyRef = useRef<string | null>(null);

  // Dev-only: open `/?preview=feed` (or `?preview=1`) on localhost to view the
  // vacancy feed without signing in — injects a sample session + profile so the
  // gate below passes and real hh.ru vacancies load. Guarded to development and
  // writes nothing to the server (raw setState, not the persisted actions); it
  // never runs in a production build.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    const preview = new URLSearchParams(window.location.search).get("preview");
    if (preview !== "feed" && preview !== "1") return;
    if (!hydrated || !authChecked) return;
    if (authUser && profile) return;
    useAppStore.setState((s) => ({
      authUser: s.authUser ?? {
        id: "preview",
        email: "preview@local",
        name: "Preview",
        avatarUrl: null,
      },
      profile: s.profile ?? {
        rawText: "Демо-резюме для предпросмотра ленты.",
        title: "Frontend-разработчик",
        skills: ["React", "TypeScript", "Next.js"],
        seniority: "Middle",
        summary: "Демо-профиль для предпросмотра ленты на localhost.",
        experienceId: "between3And6",
        updatedAt: Date.now(),
      },
      filters: { ...s.filters, text: s.filters.text || "Frontend-разработчик" },
    }));
  }, [hydrated, authChecked, authUser, profile]);

  const enabled = hydrated && authChecked && !!authUser && !!profile;

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
  // Score in API order (scoring only covers a near-term window due to rate
  // limits) so the displayed sort below doesn't shift which cards get scored.
  const loadingIds = useMatchScores(deckItems, resumeContext, enabled);

  // Show the best matches first: scored cards by descending compatibility,
  // then not-yet-scored cards in their original order. Ties keep API order so
  // the deck stays stable as scores stream in.
  const sortedItems = useMemo(() => {
    return deckItems
      .map((v, i) => ({ v, i, score: matches[v.id]?.score }))
      .sort((a, b) => {
        const sa = a.score ?? -1;
        const sb = b.score ?? -1;
        return sb !== sa ? sb - sa : a.i - b.i;
      })
      .map((x) => x.v);
  }, [deckItems, matches]);

  // Supply counts that drive prefetch + the refill banner.
  const counts = useMemo(
    () => countSupply(deckItems, matches),
    [deckItems, matches],
  );

  const canScoreMore = remaining.analyses > 0;

  // Bounded "blind search": how many pages we auto-fetched without producing a
  // new usable match. Reset whenever the usable supply grows (search working),
  // filters change, or the user explicitly asks for more.
  const autoBudgetRef = useRef(0);
  const prevUsableRef = useRef(0);
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [autoExhaustedKey, setAutoExhaustedKey] = useState<string | null>(null);
  const autoExhausted = autoExhaustedKey === filtersKey;

  useEffect(() => {
    if (counts.usableReady > prevUsableRef.current) {
      autoBudgetRef.current = 0;
      setAutoExhaustedKey(null);
    }
    prevUsableRef.current = counts.usableReady;
  }, [counts.usableReady]);

  // Fresh filters → fresh search budget.
  useEffect(() => {
    autoBudgetRef.current = 0;
  }, [filters]);

  // Keep the deck stocked with scored, usable matches.
  useEffect(() => {
    const decision = decidePrefetch({
      counts,
      deckLength: deckItems.length,
      canScoreMore,
      hasNextPage,
      isFetchingNextPage,
      budgetUsed: autoBudgetRef.current,
    });
    if (decision.fetch) {
      if (decision.consumeBudget) autoBudgetRef.current += 1;
      fetchNextPage();
    } else if (decision.exhaustBudget) {
      setAutoExhaustedKey(filtersKey); // tried enough pages; hand control to the user
    }
  }, [
    deckItems.length,
    counts,
    canScoreMore,
    filtersKey,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const handleLoadMore = () => {
    autoBudgetRef.current = 0;
    setAutoExhaustedKey(null);
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  // Which refill CTA (if any) to show above the deck.
  const refillVariant: RefillVariant | null = useMemo(() => {
    const top = sortedItems[0];
    return pickRefillVariant({
      hasTop: !!top,
      topScore: top ? matches[top.id]?.score : undefined,
      isFetchingNextPage,
      scoring: loadingIds.size > 0,
      hasNextPage,
      canScoreMore,
      autoExhausted,
    });
  }, [
    sortedItems,
    matches,
    isFetchingNextPage,
    loadingIds,
    hasNextPage,
    canScoreMore,
    autoExhausted,
  ]);

  useEffect(() => {
    if (!enabled || isLoading || isError) return;
    const firstPage = data?.pages?.[0];
    if (!firstPage) return;

    const key = JSON.stringify({
      text: filters.text,
      area: filters.area,
      salary: filters.salary,
      onlyWithSalary: filters.onlyWithSalary,
      experience: filters.experience,
      employment: filters.employment,
      schedule: filters.schedule,
      orderBy: filters.orderBy,
      found: firstPage.found,
    });
    if (feedLoadedKeyRef.current === key) return;
    feedLoadedKeyRef.current = key;

    trackGoal(ANALYTICS_GOALS.vacancyFeedLoaded, {
      found: firstPage.found,
      shown: firstPage.items.length,
      area: filters.area,
      has_query: Boolean(filters.text.trim()),
      query_length: filters.text.trim().length,
      has_salary_filter: Boolean(filters.salary || filters.onlyWithSalary),
      experience_count: filters.experience.length,
      employment_count: filters.employment.length,
      schedule_count: filters.schedule.length,
    });
  }, [data, enabled, filters, isError, isLoading]);

  useEffect(() => {
    if (!enabled || !isError) return;

    const message =
      error instanceof Error ? error.message : "unknown_feed_error";
    const key = JSON.stringify({
      text: filters.text,
      area: filters.area,
      message,
    });
    if (feedErrorKeyRef.current === key) return;
    feedErrorKeyRef.current = key;

    trackGoal(ANALYTICS_GOALS.vacancyFeedError, {
      area: filters.area,
      has_query: Boolean(filters.text.trim()),
      query_length: filters.text.trim().length,
      error_message: message,
    });
  }, [enabled, error, filters, isError]);

  const [selected, setSelected] = useState<HHVacancyItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (!hydrated || !authChecked || !authUser) {
    return <GuestHome />;
  }

  const handleSwipe = (vacancy: HHVacancyItem, dir: SwipeDirection) => {
    if (dir === "right") {
      if (remaining.responses <= 0) {
        openLimitDialog("responses");
        return;
      }
      consumeResponse();
      like(vacancy, matches[vacancy.id]);
      trackGoal(ANALYTICS_GOALS.responseCreated, {
        vacancy_id: vacancy.id,
        match_score: matches[vacancy.id]?.score,
      });
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

  if (!profile) {
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
      <div className="flex w-full flex-col gap-4">
        {refillVariant && (
          <DeckRefillBanner
            variant={refillVariant}
            weakRemaining={deckItems.length}
            loading={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            onReset={() => resetSwipes()}
            onPro={() => openPaywall("feed-refill")}
          />
        )}
        <SwipeDeck
          items={sortedItems}
          matches={matches}
          loadingIds={loadingIds}
          onSwipe={handleSwipe}
          onDetails={openDetails}
          canSwipeRight={() => remaining.responses > 0}
          onBlockedRight={() => openLimitDialog("responses")}
        />
      </div>
    );
  }

  // The current top card (drives the desktop insights panel). `sortedItems[0]`
  // is exactly what SwipeDeck renders on top, so the panel stays in sync.
  const topCard = sortedItems[0];
  const topMatch = topCard ? matches[topCard.id] : undefined;
  const topScoring = topCard ? loadingIds.has(topCard.id) : false;
  const showDeck = !!profile && !isLoading && !isError && deckItems.length > 0;

  const statusNode =
    enabled && !isLoading && !isError && deckItems.length > 0 && found > 0 ? (
      <>
        Найдено{" "}
        <span className="font-semibold text-foreground">
          {found.toLocaleString("ru-RU")}
        </span>{" "}
        вакансий{filters.text ? ` по запросу «${filters.text}»` : ""}
        {isFetchingNextPage && " · подгружаем ещё…"}
        {loadingIds.size > 0 && " · оцениваем совместимость…"}
      </>
    ) : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Sticky toolbar — a full-width bar (bg + border reach the column edges);
          its inner content is centered to align with the workspace below. */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 xl:max-w-6xl 2xl:max-w-7xl">
          <BrandMark className="lg:hidden" />
          {statusNode && (
            <p className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground lg:block">
              {statusNode}
            </p>
          )}
          <div className="flex items-center gap-2">
            <ProButton source="feed-header" />
            <FiltersSheet />
          </div>
        </div>
      </header>

      {/* Mobile/tablet status line (desktop shows it in the toolbar instead) */}
      {statusNode && (
        <div className="px-4 pt-2 text-center sm:pt-3 lg:hidden">
          <p className="text-xs text-muted-foreground">{statusNode}</p>
        </div>
      )}

      {/* Deck / states — centered workspace */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-3 pt-3 sm:py-4 xl:max-w-6xl 2xl:max-w-7xl">
        {showDeck ? (
          <div className="flex flex-1 flex-col items-center justify-start lg:justify-center xl:grid xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:items-start xl:justify-normal xl:gap-6">
            <div className="flex w-full flex-col items-center">
              <div className="w-full max-w-sm lg:max-w-md">{body}</div>
              <MatchLegend />
            </div>
            {topCard && (
              <VacancyInsights
                vacancy={topCard}
                match={topMatch}
                loading={topScoring}
                onDetails={() => openDetails(topCard)}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-start lg:justify-center">
            <div className="w-full max-w-sm lg:max-w-md">{body}</div>
          </div>
        )}
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
