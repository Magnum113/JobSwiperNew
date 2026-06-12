"use client";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Briefcase,
  Check,
  Clock,
  Info,
  MapPin,
  Sparkles,
} from "lucide-react";
import { EmployerLogo } from "@/components/employer-logo";
import { MatchRing } from "@/components/match-ring";
import { Button } from "@/components/ui/button";
import { matchStyle } from "@/lib/match-style";
import { formatSalary, relativeDate } from "@/lib/hh/format";
import { cn } from "@/lib/utils";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { MatchResult } from "@/lib/types";

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

/**
 * Desktop master–detail panel (≥ xl): the live "why it matches" breakdown for
 * the current top card. Uses only data already in the store (the AI match
 * result + the vacancy item) — no extra fetch. Hidden below xl, where the feed
 * stays a single centered deck. See ARCHITECTURE.md §13.1.
 */
export function VacancyInsights({
  vacancy,
  match,
  loading,
  onDetails,
}: {
  vacancy: HHVacancyItem;
  match?: MatchResult;
  loading?: boolean;
  onDetails: () => void;
}) {
  const ms = match ? matchStyle(match.score) : null;
  const strengths = match?.strengths?.filter(Boolean).slice(0, 4) ?? [];
  const gaps = match?.gaps?.filter(Boolean).slice(0, 4) ?? [];

  return (
    <aside className="hidden xl:flex xl:flex-col xl:gap-3">
      {/* Employer */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
        <EmployerLogo employer={vacancy.employer} size={48} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold text-foreground">
              {vacancy.employer.name}
            </p>
            {vacancy.employer.accredited_it_employer && (
              <BadgeCheck className="size-4 shrink-0 text-primary" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Опубликовано {relativeDate(vacancy.published_at)}
          </p>
        </div>
      </div>

      {/* Match verdict (metric card) */}
      <div
        className={cn(
          "rounded-2xl border p-4 shadow-card",
          ms ? cn(ms.bg, ms.border) : "border-border/70 bg-card",
        )}
      >
        {match && ms ? (
          <div className="flex items-start gap-4">
            <MatchRing score={match.score} size={64} />
            <div className="min-w-0">
              <p
                className={cn(
                  "flex items-center gap-1.5 text-base font-bold",
                  ms.text,
                )}
              >
                <span aria-hidden>{ms.emoji}</span>
                {ms.label}
              </p>
              {match.summary && (
                <p className="mt-1 text-sm text-foreground/80">
                  {match.summary}
                </p>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MatchRing score={null} loading size={48} />
            ИИ оценивает совместимость…
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" />
            Оценка совместимости появится по мере анализа.
          </div>
        )}
      </div>

      {/* Strengths / gaps breakdown (bento) */}
      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="grid gap-3 2xl:grid-cols-2">
          {strengths.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="size-4" />
                Сильные стороны
              </p>
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
                Над чем подумать
              </p>
              <ul className="space-y-1.5">
                {gaps.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-2">
        <Fact icon={Banknote} label="Зарплата" value={formatSalary(vacancy.salary)} />
        <Fact icon={MapPin} label="Город" value={vacancy.area.name} />
        {vacancy.experience && (
          <Fact icon={Briefcase} label="Опыт" value={vacancy.experience.name} />
        )}
        {vacancy.schedule && (
          <Fact icon={Clock} label="График" value={vacancy.schedule.name} />
        )}
      </div>

      {/* Action */}
      <Button
        variant="secondary"
        className="w-full rounded-xl"
        onClick={onDetails}
      >
        <Info className="size-4" />
        Подробнее о вакансии
      </Button>
    </aside>
  );
}
