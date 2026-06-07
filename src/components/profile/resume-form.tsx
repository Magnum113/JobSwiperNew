"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Pencil,
  Trash2,
  CheckCircle2,
  Briefcase,
  Gauge,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAppStore } from "@/lib/store/use-app-store";
import { postParseResume, postExtractResume } from "@/lib/api-client";
import { EXPERIENCE_OPTIONS } from "@/lib/hh/dictionaries";
import { cn } from "@/lib/utils";

const MIN_LEN = 60;

export function ResumeForm() {
  const hydrated = useAppStore((s) => s.hydrated);
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const clearProfile = useAppStore((s) => s.clearProfile);

  const hasProfile = hydrated && !!profile;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showEditor = !hasProfile || editing;

  const expLabel =
    EXPERIENCE_OPTIONS.find((o) => o.id === profile?.experienceId)?.name ?? "";

  const analyze = async (overrideText?: string) => {
    const value = (overrideText ?? text).trim();
    if (value.length < MIN_LEN) {
      toast.error("Добавьте больше текста резюме", {
        description: "Нужно хотя бы пара абзацев: опыт, навыки, должность.",
      });
      return;
    }
    setAnalyzing(true);
    try {
      const parsed = await postParseResume(value);
      setProfile({
        rawText: value,
        title: parsed.title,
        skills: parsed.skills,
        seniority: parsed.seniority,
        summary: parsed.summary,
        experienceId: parsed.experienceId,
        updatedAt: Date.now(),
      });
      setEditing(false);
      toast.success(`Профессия определена: ${parsed.title || "—"}`, {
        description: "Лента вакансий обновлена под ваше резюме.",
      });
    } catch (err) {
      toast.error("Не удалось проанализировать резюме", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const ok =
      name.endsWith(".pdf") ||
      name.endsWith(".docx") ||
      file.type === "application/pdf" ||
      file.type.includes("officedocument.wordprocessingml");
    if (!ok) {
      toast.error("Поддерживаются только файлы PDF и DOCX");
      return;
    }
    setUploading(true);
    try {
      const { text: extracted } = await postExtractResume(file);
      setText(extracted);
      toast.success("Файл обработан", { description: file.name });
      await analyze(extracted);
    } catch (err) {
      toast.error("Не удалось обработать файл", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  /* ----------------------------- Profile card ----------------------------- */
  if (hasProfile && !showEditor && profile) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-brand px-6 py-5 text-white">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-white/80">
            <CheckCircle2 className="size-4" />
            Резюме проанализировано ИИ
          </p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">
            {profile.title || "Соискатель"}
          </h2>
          {profile.summary && (
            <p className="mt-1 text-sm text-white/90">{profile.summary}</p>
          )}
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap gap-2">
            {profile.seniority && (
              <Badge variant="secondary" className="gap-1">
                <Gauge className="size-3.5" />
                {profile.seniority}
              </Badge>
            )}
            {expLabel && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="size-3.5" />
                {expLabel}
              </Badge>
            )}
          </div>

          {profile.skills.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Ключевые навыки</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => {
                setText(profile.rawText);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" />
              Обновить резюме
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                clearProfile();
                setText("");
                setEditing(false);
                toast.success("Резюме удалено");
              }}
            >
              <Trash2 className="size-4" />
              Очистить
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ------------------------------- Editor --------------------------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ваше резюме</CardTitle>
        <CardDescription>
          Загрузите файл PDF или DOCX — либо вставьте текст резюме. ИИ определит
          профессию, навыки и уровень и подберёт вакансии под вас.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload dropzone */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40",
            uploading && "pointer-events-none opacity-80",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Обрабатываем файл…
              </p>
            </>
          ) : (
            <>
              <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-medium">
                Загрузите резюме PDF или DOCX
              </p>
              <p className="text-xs text-muted-foreground">
                Перетащите файл сюда или нажмите, чтобы выбрать
              </p>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 py-0.5">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            или вставьте текст
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: Senior Frontend-разработчик. 6 лет опыта с React, TypeScript, Next.js. Делал…"
          className="min-h-56 resize-y text-sm leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {text.trim().length} символов
          </span>
          <div className="flex gap-2">
            {hasProfile && (
              <Button
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={analyzing}
              >
                Отмена
              </Button>
            )}
            <Button
              onClick={() => analyze()}
              disabled={analyzing || uploading || text.trim().length < MIN_LEN}
              className="bg-gradient-brand"
            >
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Анализируем…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Проанализировать резюме
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
