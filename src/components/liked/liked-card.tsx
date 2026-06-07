"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Loader2,
  RefreshCw,
  Sparkles,
  Info,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployerLogo } from "@/components/employer-logo";
import { MatchRing } from "@/components/match-ring";
import { useAppStore } from "@/lib/store/use-app-store";
import {
  generateCoverLetter,
  isGeneratingCoverLetter,
} from "@/lib/cover-letter";
import { formatSalary } from "@/lib/hh/format";
import { matchStyle } from "@/lib/match-style";
import { cn } from "@/lib/utils";
import type { LikedItem } from "@/lib/types";

export function LikedCard({
  item,
  onDetails,
}: {
  item: LikedItem;
  onDetails: () => void;
}) {
  const removeLiked = useAppStore((s) => s.removeLiked);
  const [copied, setCopied] = useState(false);

  const { vacancy, match, coverLetter: cl } = item;
  const id = vacancy.id;
  const applyUrl = vacancy.apply_alternate_url ?? vacancy.alternate_url ?? undefined;

  const generating = cl.status === "loading" && isGeneratingCoverLetter(id);
  const showLetter = cl.status === "done" && !!cl.text;
  const needsGenerate =
    cl.status === "idle" ||
    cl.status === "error" ||
    (cl.status === "loading" && !isGeneratingCoverLetter(id));

  const ms = match ? matchStyle(match.score) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cl.text);
      setCopied(true);
      toast.success("Сопроводительное письмо скопировано");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <EmployerLogo employer={vacancy.employer} size={44} />
        <button
          type="button"
          onClick={onDetails}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {vacancy.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {vacancy.employer.name} · {vacancy.area.name}
          </p>
        </button>
        {match ? (
          <MatchRing score={match.score} size={46} />
        ) : (
          <Badge variant="secondary" className="shrink-0">
            без оценки
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <span className="text-sm font-bold text-gradient-brand">
          {formatSalary(vacancy.salary)}
        </span>
        {ms && (
          <span className={cn("text-xs font-medium", ms.text)}>
            · {ms.label}
          </span>
        )}
      </div>

      {/* Cover letter */}
      <div className="border-t border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="size-4 text-primary" />
          Сопроводительное письмо
        </div>

        {generating && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              ИИ пишет письмо под эту вакансию…
            </p>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-9/12" />
          </div>
        )}

        {showLetter && (
          <>
            <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background p-3 text-sm leading-relaxed">
              {cl.text}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={copy} className="gap-1.5">
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Скопировано" : "Копировать письмо"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  generateCoverLetter(id);
                  toast.info("Генерируем письмо заново…");
                }}
                className="gap-1.5"
              >
                <RefreshCw className="size-4" />
                Переписать
              </Button>
            </div>
          </>
        )}

        {needsGenerate && !generating && (
          <div className="space-y-2">
            {cl.status === "error" && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4" />
                Не удалось сгенерировать письмо.
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                generateCoverLetter(id);
                toast.info("ИИ готовит письмо…");
              }}
              className="gap-1.5"
            >
              <Sparkles className="size-4" />
              {cl.status === "error" ? "Повторить" : "Сгенерировать письмо"}
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border/60 p-3">
        {applyUrl && (
          <Button
            className="flex-1 bg-gradient-brand"
            nativeButton={false}
            render={
              <a href={applyUrl} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-4" />
            Откликнуться на hh.ru
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={onDetails} aria-label="Подробнее">
          <Info className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Удалить из откликов"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            removeLiked(id);
            toast.success("Удалено из откликов");
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
