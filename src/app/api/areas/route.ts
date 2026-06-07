import { NextResponse } from "next/server";
import { getRussianAreas, HHError } from "@/lib/hh/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const areas = await getRussianAreas();
    return NextResponse.json({ areas });
  } catch (err) {
    const status = err instanceof HHError ? err.status : 500;
    const message =
      err instanceof Error ? err.message : "Ошибка загрузки регионов";
    return NextResponse.json({ error: message }, { status });
  }
}
