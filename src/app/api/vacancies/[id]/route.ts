import { NextResponse } from "next/server";
import { getVacancy, HHError } from "@/lib/hh/client";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await getVacancy(id);
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof HHError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка загрузки вакансии";
    return NextResponse.json({ error: message }, { status });
  }
}
