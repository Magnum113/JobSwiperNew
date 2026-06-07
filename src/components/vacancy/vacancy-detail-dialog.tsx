"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Heart, ExternalLink, MapPin, Briefcase, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmployerLogo } from "@/components/employer-logo";
import { MatchRing } from "@/components/match-ring";
import { matchStyle } from "@/lib/match-style";
import { formatSalary } from "@/lib/hh/format";
import { cn } from "@/lib/utils";
import type { HHVacancyItem, HHVacancyDetail } from "@/lib/hh/types";
import type { MatchResult } from "@/lib/types";

function SanitizedHtml({ html }: { html: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "p", "br", "ul", "ol", "li", "strong", "b", "em", "i",
          "h2", "h3", "h4", "span", "a",
        ],
        ALLOWED_ATTR: ["href", "target", "rel"],
      }),
    [html],
  );
  return (
    <div
      className="vacancy-html"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

interface Props {
  vacancy: HHVacancyItem | null;
  match?: MatchResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLike?: (vacancy: HHVacancyItem) => void;
  isLiked?: boolean;
}

export function VacancyDetailDialog({
  vacancy,
  match,
  open,
  onOpenChange,
  onLike,
  isLiked,
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["vacancy", vacancy?.id],
    queryFn: async (): Promise<HHVacancyDetail> => {
      const res = await fetch(`/api/vacancies/${vacancy!.id}`);
      if (!res.ok) throw new Error("Не удалось загрузить вакансию");
      return res.json();
    },
    enabled: open && !!vacancy,
    staleTime: 1000 * 60 * 10,
  });

  const ms = match ? matchStyle(match.score) : null;
  const applyUrl =
    vacancy?.apply_alternate_url ?? vacancy?.alternate_url ?? undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {vacancy && (
          <>
            <DialogHeader className="space-y-0 border-b border-border/60 p-5 text-left">
              <div className="flex items-start gap-3 pr-6">
                <EmployerLogo employer={vacancy.employer} size={48} />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-balance text-lg leading-snug">
                    {vacancy.name}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 truncate">
                    {vacancy.employer.name}
                  </DialogDescription>
                </div>
                {match && <MatchRing score={match.score} size={52} />}
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-5">
                <p className="text-xl font-bold text-gradient-brand">
                  {formatSalary(vacancy.salary)}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1 font-normal">
                    <MapPin className="size-3.5" /> {vacancy.area.name}
                  </Badge>
                  {vacancy.experience && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Briefcase className="size-3.5" />{" "}
                      {vacancy.experience.name}
                    </Badge>
                  )}
                  {vacancy.schedule && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Clock className="size-3.5" /> {vacancy.schedule.name}
                    </Badge>
                  )}
                </div>

                {ms && match && (
                  <div className={cn("rounded-2xl border p-4", ms.bg, ms.border)}>
                    <p className={cn("flex items-center gap-2 font-semibold", ms.text)}>
                      <span className="text-lg">{ms.emoji}</span>
                      {ms.label} — {match.score}%
                    </p>
                    {match.summary && (
                      <p className="mt-1.5 text-sm text-foreground/80">
                        {match.summary}
                      </p>
                    )}
                    {match.strengths.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Ваши плюсы
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {match.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-foreground/80">
                              ✓ {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {match.gaps.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Над чем подумать
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {match.gaps.map((g, i) => (
                            <li key={i} className="text-sm text-foreground/70">
                              • {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-10/12" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ) : (
                  <>
                    {data?.key_skills && data.key_skills.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-semibold">Ключевые навыки</p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.key_skills.map((s) => (
                            <Badge key={s.name} variant="outline">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {data?.description && (
                      <div>
                        <p className="mb-2 text-sm font-semibold">Описание</p>
                        <SanitizedHtml html={data.description} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 border-t border-border/60 p-4">
              {onLike && (
                <Button
                  variant={isLiked ? "secondary" : "default"}
                  className="flex-1 rounded-xl"
                  onClick={() => onLike(vacancy)}
                  disabled={isLiked}
                >
                  <Heart className={cn("size-4", isLiked && "fill-current")} />
                  {isLiked ? "В откликах" : "Откликнуться"}
                </Button>
              )}
              {applyUrl && (
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  nativeButton={false}
                  render={
                    <a
                      href={applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLink className="size-4" />
                  На hh.ru
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
