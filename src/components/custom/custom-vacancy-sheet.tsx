"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FilePlus2, Sparkles, ChevronRight, FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/store/use-app-store";
import { generateCustomLetter } from "@/lib/cover-letter";

const MIN_LEN = 40;

export function CustomVacancySheet() {
  const hydrated = useAppStore((s) => s.hydrated);
  const profile = useAppStore((s) => s.profile);
  const addCustomLetter = useAppStore((s) => s.addCustomLetter);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [text, setText] = useState("");

  const hasProfile = hydrated && !!profile;
  const canSubmit = hasProfile && text.trim().length >= MIN_LEN;

  const submit = () => {
    if (!canSubmit) return;
    const id = addCustomLetter({ title, company, vacancyText: text });
    generateCustomLetter(id);
    toast.success("Готовим письмо под вашу вакансию…", {
      description: "Письмо появится в списке откликов.",
    });
    setTitle("");
    setCompany("");
    setText("");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
          />
        }
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white">
          <FilePlus2 className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Письмо под любую вакансию
          </span>
          <span className="block text-xs text-muted-foreground">
            Вставьте текст любой вакансии — ИИ напишет сопроводительное
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-2xl overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Письмо под любую вакансию
          </SheetTitle>
          <SheetDescription>
            Вставьте описание любой вакансии — ИИ подготовит сопроводительное
            письмо под ваше резюме.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-2">
          {!hasProfile && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
              <FileText className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-foreground/80">
                Сначала добавьте резюме в{" "}
                <Link href="/profile" className="font-semibold text-primary underline-offset-2 hover:underline">
                  личном кабинете
                </Link>{" "}
                — без него письмо не сгенерировать.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cv-title">Должность (необязательно)</Label>
              <Input
                id="cv-title"
                placeholder="Например, Product Manager"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv-company">Компания (необязательно)</Label>
              <Input
                id="cv-company"
                placeholder="Например, Acme Inc."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-text">Текст вакансии</Label>
            <Textarea
              id="cv-text"
              placeholder="Вставьте сюда описание вакансии: обязанности, требования, условия…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-48 resize-y text-sm leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              {text.trim().length} символов
              {text.trim().length > 0 && text.trim().length < MIN_LEN
                ? ` · нужно минимум ${MIN_LEN}`
                : ""}
            </p>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="bg-gradient-brand"
          >
            <Sparkles className="size-4" />
            Сгенерировать письмо
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
