import { NextResponse } from "next/server";
import { findBillingOrderForUser } from "@/lib/billing/orders";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("orderId") ?? "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId обязателен" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }

  try {
    const order = await findBillingOrderForUser(orderId, userId);
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.id,
      planId: order.plan_id,
      amount: order.amount,
      status: order.status,
      paidAt: order.paid_at,
    });
  } catch (error) {
    console.error("[billing:order]", error);
    return NextResponse.json(
      { error: "Не удалось получить заказ" },
      { status: 500 },
    );
  }
}
