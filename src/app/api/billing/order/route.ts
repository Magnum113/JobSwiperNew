import { NextResponse } from "next/server";
import {
  findBillingOrderForUser,
  grantEntitlementForOrder,
  logBillingEvent,
  markBillingOrderStatus,
  revokeEntitlementForOrder,
  type BillingOrderRow,
} from "@/lib/billing/orders";
import {
  confirmTbankPayment,
  getTbankPaymentState,
} from "@/lib/billing/tbank";
import { getPlanAmountKopeks, getPlanById } from "@/lib/plans";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isFinalStatus(status: string): boolean {
  return (
    status === "confirmed" ||
    status === "refunded" ||
    status === "failed" ||
    status === "canceled" ||
    status === "rejected"
  );
}

async function reconcileOrderWithTbank(
  order: BillingOrderRow,
): Promise<BillingOrderRow> {
  if (isFinalStatus(order.status) || !order.tbank_payment_id) return order;

  const plan = getPlanById(order.plan_id);
  if (!plan) return order;

  const state = await getTbankPaymentState(order.tbank_payment_id);
  await logBillingEvent(order.id, "tbank_get_state_result", {
    paymentId: order.tbank_payment_id,
    status: state.status,
    success: state.success,
    errorCode: state.errorCode,
    previousStatus: order.status,
  });

  if (state.success && state.status === "CONFIRMED") {
    await markBillingOrderStatus(order.id, {
      status: "confirmed",
      rawPayload: state.raw,
      paidAt: order.paid_at ?? new Date().toISOString(),
    });
    await grantEntitlementForOrder(order, plan);
    return { ...order, status: "confirmed", paid_at: order.paid_at };
  }

  if (state.success && state.status === "AUTHORIZED") {
    const planAmount = getPlanAmountKopeks(plan);
    if (order.amount !== planAmount) return order;

    const confirm = await confirmTbankPayment(order.tbank_payment_id, order.amount);
    await logBillingEvent(order.id, "tbank_confirm_result", {
      paymentId: order.tbank_payment_id,
      status: confirm.status,
      success: confirm.success,
      errorCode: confirm.errorCode,
      source: "order_poll",
    });

    if (confirm.success && confirm.status === "CONFIRMED") {
      await markBillingOrderStatus(order.id, {
        status: "confirmed",
        rawPayload: confirm.raw,
        paidAt: new Date().toISOString(),
      });
      await grantEntitlementForOrder(order, plan);
      return { ...order, status: "confirmed", paid_at: new Date().toISOString() };
    }

    await markBillingOrderStatus(order.id, {
      status: "authorized",
      rawPayload: state.raw,
    });
    return { ...order, status: "authorized" };
  }

  if (state.success && state.status === "REFUNDED") {
    await markBillingOrderStatus(order.id, {
      status: "refunded",
      rawPayload: state.raw,
    });
    await revokeEntitlementForOrder(order.id);
    return { ...order, status: "refunded" };
  }

  return order;
}

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

    const reconciledOrder = await reconcileOrderWithTbank(order);

    console.info("[billing:order] status checked", {
      orderId: reconciledOrder.id,
      status: reconciledOrder.status,
      paidAt: reconciledOrder.paid_at,
    });

    return NextResponse.json({
      orderId: reconciledOrder.id,
      planId: reconciledOrder.plan_id,
      amount: reconciledOrder.amount,
      status: reconciledOrder.status,
      paidAt: reconciledOrder.paid_at,
    });
  } catch (error) {
    console.error("[billing:order]", error);
    return NextResponse.json(
      { error: "Не удалось получить заказ" },
      { status: 500 },
    );
  }
}
