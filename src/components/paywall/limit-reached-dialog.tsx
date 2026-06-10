"use client";
import { useEffect } from "react";
import { Crown, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/use-app-store";
import { ANALYTICS_GOALS, trackGoal } from "@/lib/analytics";
import type { LimitKind } from "@/lib/store/use-app-store";

const COPY: Record<LimitKind, { title: string; text: string }> = {
  responses: {
    title: "Отклики закончились",
    text: "Вы использовали все доступные отклики на бесплатном плане. Купите пакет лимитов, чтобы продолжить откликаться.",
  },
  analyses: {
    title: "Анализы вакансий закончились",
    text: "Лимит ИИ-оценки вакансий на бесплатном плане исчерпан. Купите пакет, чтобы получить больше анализов.",
  },
  resumes: {
    title: "Лимит анализов резюме исчерпан",
    text: "Вы использовали все анализы резюме на бесплатном плане. Купите пакет лимитов, чтобы анализировать больше резюме.",
  },
};

export function LimitReachedDialog() {
  const kind = useAppStore((s) => s.limitDialogKind);
  const closeLimitDialog = useAppStore((s) => s.closeLimitDialog);
  const openPaywall = useAppStore((s) => s.openPaywall);

  const copy = kind ? COPY[kind] : null;

  useEffect(() => {
    if (!kind) return;
    trackGoal(ANALYTICS_GOALS.limitDialogOpen, {
      limit_kind: kind,
    });
  }, [kind]);

  const handleUpgrade = () => {
    closeLimitDialog();
    openPaywall(`limit-${kind}`);
  };

  return (
    <Dialog
      open={kind !== null}
      onOpenChange={(o) => !o && closeLimitDialog()}
    >
      <DialogContent showCloseButton={false} className="max-w-[22rem] text-center">
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-sm">
            <Lock className="size-7" />
          </span>
          <DialogTitle className="text-lg font-bold">
            {copy?.title ?? "Лимит исчерпан"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-snug">
            {copy?.text ??
              "Лимит на бесплатном плане исчерпан. Купите пакет лимитов, чтобы продолжить."}
          </DialogDescription>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Button
            onClick={handleUpgrade}
            className="h-11 w-full rounded-xl bg-gradient-brand text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] hover:opacity-95"
          >
            <Crown className="size-4 fill-white/40" />
            Купить пакет
          </Button>
          <DialogClose
            render={
              <Button variant="ghost" className="w-full text-muted-foreground" />
            }
          >
            Позже
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
