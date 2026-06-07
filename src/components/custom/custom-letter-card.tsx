"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Trash2,
  Loader2,
  RefreshCw,
  Sparkles,
  FileText,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/lib/store/use-app-store";
import {
  generateCustomLetter,
  isGeneratingCoverLetter,
} from "@/lib/cover-letter";
import { cn } from "@/lib/utils";
import type { CustomLetter } from "@/lib/types";

export function CustomLetterCard({ item }: { item: CustomLetter }) {
  const removeCustomLetter = useAppStore((s) => s.removeCustomLetter);
  const [copied, setCopied] = useState(false);
  const [showText, setShowText] = useState(false);

  const cl = item.letter;
  const generating = cl.status === "loading" && isGeneratingCoverLetter(item.id);
  const showLetter = cl.status === "done" && !!cl.text;
  const needsGenerate =
    cl.status === "idle" ||
    cl.status === "error" ||
    (cl.status === "loading" && !isGeneratingCoverLetter(item.id));

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
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {item.title || "Своя вакансия"}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {item.company || "Без компании"}
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          Своя вакансия
        </Badge>
      </div>

      {/* Vacancy text (collapsible) */}
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setShowText((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              showText && "rotate-180",
            )}
          />
          {showText ? "Скрыть текст вакансии" : "Показать текст вакансии"}
        </button>
        {showText && (
          <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            {item.vacancyText}
          </p>
        )}
      </div>

      {/* Cover letter */}
      <div className="border-t border-border/60 bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
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
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Скопировано" : "Копировать письмо"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  generateCustomLetter(item.id);
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
                generateCustomLetter(item.id);
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
      <div className="flex justify-end border-t border-border/60 p-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-destructive"
          onClick={() => {
            removeCustomLetter(item.id);
            toast.success("Удалено");
          }}
        >
          <Trash2 className="size-4" />
          Удалить
        </Button>
      </div>
    </div>
  );
}
