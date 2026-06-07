"use client";
import { useEffect, useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AreaCombobox } from "./area-combobox";
import { cn } from "@/lib/utils";
import { useAppStore, DEFAULT_FILTERS } from "@/lib/store/use-app-store";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  EXPERIENCE_OPTIONS,
  EMPLOYMENT_OPTIONS,
  SCHEDULE_OPTIONS,
  ORDER_BY_OPTIONS,
} from "@/lib/hh/dictionaries";
import type { Filters } from "@/lib/types";

function ChipGroup({
  options,
  value,
  onToggle,
}: {
  options: { id: string; name: string }[];
  value: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground/80 hover:bg-muted",
            )}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}

function countActive(f: Filters): number {
  let n = 0;
  if (f.area && f.area !== DEFAULT_FILTERS.area) n++;
  n += f.experience.length;
  n += f.employment.length;
  n += f.schedule.length;
  if (f.salary) n++;
  if (f.onlyWithSalary) n++;
  if (f.orderBy !== DEFAULT_FILTERS.orderBy) n++;
  return n;
}

export function FiltersSheet() {
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const profileTitle = useAppStore((s) => s.profile?.title ?? "");
  const { data: areas } = useAreas();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  // Sync draft whenever the sheet opens.
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggle = (key: "experience" | "employment" | "schedule") => (id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id)
        ? d[key].filter((x) => x !== id)
        : [...d[key], id],
    }));

  const apply = () => {
    setFilters(draft);
    setOpen(false);
  };

  const reset = () =>
    setDraft({ ...DEFAULT_FILTERS, text: profileTitle });

  const activeCount = countActive(filters);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative rounded-full"
            aria-label="Фильтры"
          />
        }
      >
        <SlidersHorizontal className="size-5" />
        {activeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="mx-auto max-h-[90dvh] max-w-2xl overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader>
          <SheetTitle>Фильтры вакансий</SheetTitle>
          <SheetDescription>
            Уточните поиск под вашу профессию и предпочтения.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="filter-text">Профессия / ключевые слова</Label>
            <Input
              id="filter-text"
              placeholder="Например, Frontend-разработчик"
              value={draft.text}
              onChange={(e) =>
                setDraft((d) => ({ ...d, text: e.target.value }))
              }
            />
            {profileTitle && (
              <p className="text-xs text-muted-foreground">
                Подставлено из резюме: «{profileTitle}»
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Город / регион</Label>
              <AreaCombobox
                areas={areas ?? []}
                value={draft.area}
                onChange={(id) => setDraft((d) => ({ ...d, area: id }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Сортировка</Label>
              <Select
                value={draft.orderBy}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, orderBy: (v as string) ?? d.orderBy }))
                }
                items={ORDER_BY_OPTIONS.map((o) => ({
                  value: o.id,
                  label: o.name,
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_BY_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Опыт работы</Label>
            <ChipGroup
              options={EXPERIENCE_OPTIONS}
              value={draft.experience}
              onToggle={toggle("experience")}
            />
          </div>

          <div className="space-y-2">
            <Label>График работы</Label>
            <ChipGroup
              options={SCHEDULE_OPTIONS}
              value={draft.schedule}
              onToggle={toggle("schedule")}
            />
          </div>

          <div className="space-y-2">
            <Label>Тип занятости</Label>
            <ChipGroup
              options={EMPLOYMENT_OPTIONS}
              value={draft.employment}
              onToggle={toggle("employment")}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filter-salary">Зарплата от, ₽</Label>
              <Input
                id="filter-salary"
                type="number"
                inputMode="numeric"
                placeholder="100000"
                value={draft.salary ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    salary: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
                <span className="text-sm font-medium">Только с зарплатой</span>
                <Switch
                  checked={draft.onlyWithSalary}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, onlyWithSalary: v }))
                  }
                />
              </label>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button
            variant="ghost"
            onClick={reset}
            className="gap-2"
            type="button"
          >
            <RotateCcw className="size-4" />
            Сбросить
          </Button>
          <SheetClose
            render={
              <Button onClick={apply} className="flex-1 bg-gradient-brand" />
            }
          >
            Показать вакансии
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
