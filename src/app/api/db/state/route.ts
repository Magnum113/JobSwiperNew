import { NextResponse } from "next/server";
import { loadState } from "@/lib/supabase/queries";
import { getAuthenticatedUserId, resolveRequestUserId } from "@/lib/supabase/auth";
import { getActivePurchasedLimits } from "@/lib/billing/orders";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const requestedUserId = new URL(req.url).searchParams.get("userId") ?? "";
  const authenticatedUserId = await getAuthenticatedUserId();
  const userId = await resolveRequestUserId(requestedUserId);
  if (!userId) {
    return NextResponse.json({ error: "userId обязателен" }, { status: 400 });
  }
  try {
    const state = await loadState(userId);
    const purchasedLimits =
      authenticatedUserId && authenticatedUserId === userId
        ? await getActivePurchasedLimits(userId)
        : state.purchasedLimits;
    return NextResponse.json({ ...state, purchasedLimits });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка БД" },
      { status: 500 },
    );
  }
}
