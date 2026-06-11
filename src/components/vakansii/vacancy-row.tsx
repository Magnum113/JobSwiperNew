import { MapPin } from "lucide-react";
import type { HHVacancyItem } from "@/lib/hh/types";
import { formatSalary, relativeDate } from "@/lib/hh/format";

// Server component, no client JS. One vacancy as a row linking out to hh.ru.
// External links are rel="nofollow" — these are third-party listings, no reason
// to pass crawl equity to hh.ru on every card.
export function VacancyRow({ v }: { v: HHVacancyItem }) {
  const url = v.alternate_url ?? undefined;
  const salary = formatSalary(v.salary);
  const hasSalary = salary !== "Зарплата не указана";

  return (
    <a
      href={url}
      target="_blank"
      rel="nofollow noopener"
      className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-colors hover:border-violet-300 hover:bg-accent/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-violet-700">
          {v.name}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {relativeDate(v.published_at)}
        </span>
      </div>

      <p className="mt-1.5 text-sm text-muted-foreground">{v.employer?.name}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={
            hasSalary
              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
              : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          }
        >
          {salary}
        </span>
        {v.area?.name && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {v.area.name}
          </span>
        )}
        {v.schedule?.id === "remote" && (
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground">
            Удалённо
          </span>
        )}
      </div>
    </a>
  );
}
