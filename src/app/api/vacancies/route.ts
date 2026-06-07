import { NextResponse } from "next/server";
import { searchVacancies, HHError } from "@/lib/hh/client";
import type { VacancySearchParams } from "@/lib/hh/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  // Arrays accept either repeated params or a single comma-separated value.
  const multi = (key: string): string[] => {
    const all = sp.getAll(key);
    if (all.length > 1) return all;
    const single = sp.get(key);
    return single ? single.split(",").filter(Boolean) : [];
  };

  const params: VacancySearchParams = {
    text: sp.get("text") ?? undefined,
    area: sp.get("area") ?? undefined,
    salary: sp.get("salary") ? Number(sp.get("salary")) : undefined,
    only_with_salary: sp.get("only_with_salary") === "true",
    experience: multi("experience"),
    employment: multi("employment"),
    schedule: multi("schedule"),
    order_by: sp.get("order_by") ?? undefined,
    per_page: sp.get("per_page") ? Number(sp.get("per_page")) : 20,
    page: sp.get("page") ? Number(sp.get("page")) : 0,
  };

  try {
    const data = await searchVacancies(params);
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof HHError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка загрузки вакансий";
    return NextResponse.json({ error: message }, { status });
  }
}
