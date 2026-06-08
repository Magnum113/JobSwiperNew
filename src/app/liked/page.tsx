"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Layers } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ProButton } from "@/components/paywall/pro-button";
import { EmptyState } from "@/components/empty-state";
import { LikedCard } from "@/components/liked/liked-card";
import { CustomVacancySheet } from "@/components/custom/custom-vacancy-sheet";
import { CustomLetterCard } from "@/components/custom/custom-letter-card";
import { VacancyDetailDialog } from "@/components/vacancy/vacancy-detail-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/use-app-store";
import type { HHVacancyItem } from "@/lib/hh/types";

export default function LikedPage() {
  const hydrated = useAppStore((s) => s.hydrated);
  const liked = useAppStore((s) => s.liked);
  const customLetters = useAppStore((s) => s.customLetters);

  // Merge swiped vacancies and custom-vacancy letters into one time-sorted feed.
  const feed = useMemo(() => {
    const entries = [
      ...Object.values(liked).map((i) => ({
        kind: "liked" as const,
        t: i.likedAt,
        liked: i,
      })),
      ...Object.values(customLetters).map((c) => ({
        kind: "custom" as const,
        t: c.createdAt,
        custom: c,
      })),
    ];
    return entries.sort((a, b) => b.t - a.t);
  }, [liked, customLetters]);

  const [selected, setSelected] = useState<HHVacancyItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <BrandMark />
        <ProButton source="liked-header" />
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="pt-1">
          <h1 className="text-2xl font-bold tracking-tight">Мои отклики</h1>
        </div>

        {hydrated && <CustomVacancySheet />}

        {!hydrated ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : feed.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Пока нет откликов"
            description="Свайпайте вакансии вправо в ленте или добавьте свою вакансию выше — сюда попадут отклики с готовым сопроводительным письмом от ИИ."
            action={
              <Button
                className="bg-gradient-brand"
                nativeButton={false}
                render={<Link href="/" />}
              >
                <Layers className="size-4" />
                Перейти к ленте
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {feed.map((entry) =>
              entry.kind === "liked" ? (
                <LikedCard
                  key={`l_${entry.liked.vacancy.id}`}
                  item={entry.liked}
                  onDetails={() => {
                    setSelected(entry.liked.vacancy);
                    setDetailOpen(true);
                  }}
                />
              ) : (
                <CustomLetterCard
                  key={`c_${entry.custom.id}`}
                  item={entry.custom}
                />
              ),
            )}
          </div>
        )}
      </div>

      <VacancyDetailDialog
        vacancy={selected}
        match={selected ? liked[selected.id]?.match : undefined}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
