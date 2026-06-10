import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/site-url";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getPlanAmountKopeks, getPlanById } from "@/lib/plans";
import { createBillingOrder, markBillingOrderInitialized } from "@/lib/billing/orders";
import { initTbankPayment } from "@/lib/billing/tbank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { planId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const plan = getPlanById(body.planId);
  if (!plan) {
    return NextResponse.json({ error: "Неизвестный пакет" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Для покупки пакета нужно войти в аккаунт" },
      { status: 401 },
    );
  }

  try {
    const origin = getAppOrigin(req);
    const order = await createBillingOrder(
      userId,
      plan,
      getPlanAmountKopeks(plan),
    );
    const payment = await initTbankPayment({
      orderId: order.id,
      amount: order.amount,
      description: `Пакет лимитов JobSwiper: ${plan.name}`,
      userId,
      successUrl: `${origin}/profile?payment=success&orderId=${order.id}`,
      failUrl: `${origin}/profile?payment=fail&orderId=${order.id}`,
      notificationUrl: `${origin}/api/billing/tbank/webhook`,
    });

    await markBillingOrderInitialized(order.id, {
      paymentId: payment.paymentId,
      paymentUrl: payment.paymentUrl,
      rawPayload: payment.raw,
    });

    console.info("[billing:create-payment] payment initialized", {
      orderId: order.id,
      paymentId: payment.paymentId,
      planId: plan.id,
      amount: order.amount,
      userId,
    });

    return NextResponse.json({
      orderId: order.id,
      paymentId: payment.paymentId,
      paymentUrl: payment.paymentUrl,
    });
  } catch (error) {
    console.error("[billing:create-payment]", error);
    return NextResponse.json(
      { error: "Не удалось создать платёж" },
      { status: 500 },
    );
  }
}
