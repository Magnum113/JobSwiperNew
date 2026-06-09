"use client";
import { useEffect, useState } from "react";
import { Loader2, FileText, MapPin, Briefcase, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchHhResumes, importHhResume } from "@/lib/api-client";
import type { HhResumeChoice } from "@/lib/hh/resume-map";
import { useAppStore } from "@/lib/store/use-app-store";

type Outcome = "imported" | "choose" | "empty" | null;

function readOutcome(): Outcome {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("hh");
  return value === "imported" || value === "choose" || value === "empty"
    ? value
    : null;
}

/**
 * Reacts to the `?hh=...` outcome set by the hh.ru OAuth callback. Captures the
 * param during render (via useState initializer) so it survives auth-buttons
 * stripping the query string in its own mount effect.
 */
export function HhResumeImport() {
  // Captured before any sibling effect clears the URL. Open/loading are seeded
  // from it so the effect never sets state synchronously (cascading renders).
  const [outcome] = useState<Outcome>(readOutcome);
  const setProfile = useAppStore((s) => s.setProfile);

  const [open, setOpen] = useState(() => outcome === "choose");
  const [loading, setLoading] = useState(() => outcome === "choose");
  const [resumes, setResumes] = useState<HhResumeChoice[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (outcome === "imported") {
      toast.success("Резюме из hh.ru добавлено в кабинет");
    } else if (outcome === "empty") {
      toast.info("В вашем аккаунте hh.ru нет резюме", {
        description: "Добавьте резюме на hh.ru или вставьте его текст ниже.",
      });
    } else if (outcome === "choose") {
      fetchHhResumes()
        .then(setResumes)
        .catch((err) =>
          toast.error("Не удалось загрузить резюме с hh.ru", {
            description: err instanceof Error ? err.message : undefined,
          }),
        )
        .finally(() => setLoading(false));
    }
  }, [outcome]);

  const pick = async (id: string) => {
    setImportingId(id);
    try {
      const profile = await importHhResume(id);
      setProfile(profile);
      toast.success(`Резюме добавлено: ${profile.title || "—"}`, {
        description: "Лента вакансий обновлена под ваше резюме.",
      });
      setOpen(false);
    } catch (err) {
      toast.error("Не удалось импортировать резюме", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setImportingId(null);
    }
  };

  if (outcome !== "choose") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Выберите резюме из hh.ru</DialogTitle>
          <DialogDescription>
            В вашем аккаунте hh.ru несколько резюме. Выберите, какое добавить в
            кабинет.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </>
          ) : resumes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Резюме не найдены.
            </p>
          ) : (
            resumes.map((r) => {
              const busy = importingId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={Boolean(importingId)}
                  onClick={() => pick(r.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-60"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {r.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {r.area && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {r.area}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="size-3" />
                        {r.experience}
                      </span>
                    </div>
                  </div>
                  {busy ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Check className="size-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setOpen(false)}
          disabled={Boolean(importingId)}
        >
          Позже
        </Button>
      </DialogContent>
    </Dialog>
  );
}
