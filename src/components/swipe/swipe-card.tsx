"use client";
import {
  Banknote,
  MapPin,
  Briefcase,
  Clock,
  BadgeCheck,
  Info,
} from "lucide-react";
import { EmployerLogo } from "@/components/employer-logo";
import { MatchRing } from "@/components/match-ring";
import { Button } from "@/components/ui/button";
import { matchStyle } from "@/lib/match-style";
import { cn } from "@/lib/utils";
import {
  formatSalary,
  cleanSnippet,
  relativeDate,
} from "@/lib/hh/format";
import type { HHVacancyItem } from "@/lib/hh/types";
import type { MatchResult } from "@/lib/types";

function Chip({
  icon: Icon,
  children,
  className,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </span>
  );
}

interface SwipeCardProps {
  vacancy: HHVacancyItem;
  match?: MatchResult;
  matchLoading?: boolean;
  onDetails?: () => void;
  interactive?: boolean;
}

export function SwipeCard({
  vacancy,
  match,
  matchLoading,
  onDetails,
  interactive = true,
}: SwipeCardProps) {
  const snippet = cleanSnippet(vacancy.snippet);
  const hasSalary =
    vacancy.salary && (vacancy.salary.from != null || vacancy.salary.to != null);
  const ms = match ? matchStyle(match.score) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-border/70 bg-card shadow-card">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <EmployerLogo employer={vacancy.employer} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {vacancy.employer.name}
            </p>
            {vacancy.employer.accredited_it_employer && (
              <BadgeCheck className="size-4 shrink-0 text-primary" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            {relativeDate(vacancy.published_at)}
          </p>
        </div>
        <MatchRing
          score={match?.score ?? null}
          loading={matchLoading}
          size={56}
        />
      </div>

      {/* Title */}
      <div className="px-5">
        <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight">
          {vacancy.name}
        </h2>
      </div>

      {/* Salary */}
      <div className="px-5 pt-3">
        <p
          className={cn(
            "text-lg font-bold",
            hasSalary ? "text-gradient-brand" : "text-muted-foreground",
          )}
        >
          {formatSalary(vacancy.salary)}
        </p>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap gap-2 px-5 pt-3">
        <Chip icon={MapPin}>{vacancy.area.name}</Chip>
        {vacancy.experience && (
          <Chip icon={Briefcase}>{vacancy.experience.name}</Chip>
        )}
        {vacancy.schedule && <Chip icon={Clock}>{vacancy.schedule.name}</Chip>}
        {hasSalary && (
          <Chip icon={Banknote} className="bg-primary/10 text-primary">
            С зарплатой
          </Chip>
        )}
      </div>

      {/* AI verdict */}
      {ms && match && (
        <div className="px-5 pt-4">
          <div
            className={cn(
              "rounded-2xl border p-3",
              ms.bg,
              ms.border,
            )}
          >
            <p className={cn("flex items-center gap-1.5 text-sm font-semibold", ms.text)}>
              <span>{ms.emoji}</span>
              {ms.label}
            </p>
            {match.summary && (
              <p className="mt-1 text-sm text-foreground/80">{match.summary}</p>
            )}
          </div>
        </div>
      )}

      {/* Snippet */}
      <div className="relative mt-3 flex-1 overflow-hidden px-5">
        {snippet ? (
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-5">
            {snippet}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/60">
            Описание появится при просмотре подробностей.
          </p>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
      </div>

      {/* Footer */}
      <div className="p-5 pt-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full rounded-xl"
          onClick={onDetails}
          tabIndex={interactive ? 0 : -1}
        >
          <Info className="size-4" />
          Подробнее о вакансии
        </Button>
      </div>
    </div>
  );
}
