import { NextResponse } from "next/server";
import { getPlanAmountKopeks, getPlanById } from "@/lib/plans";
import {
  findBillingOrderByNotification,
  grantEntitlementForOrder,
  mapTbankStatusToOrderStatus,
  markBillingOrderFromNotification,
  revokeEntitlementForOrder,
} from "@/lib/billing/orders";
import {
  isTbankConfirmedPayment,
  TBANK_SUCCESS_RESPONSE,
  type TbankNotificationPayload,
  verifyTbankNotificationToken,
} from "@/lib/billing/tbank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ok() {
  return new Response(TBANK_SUCCESS_RESPONSE, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function readNotificationPayload(
  req: Request,
): Promise<TbankNotificationPayload> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await req.json()) as TbankNotificationPayload;
  }

  const text = await req.text();
  if (!text.trim()) return {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }

  try {
    return JSON.parse(text) as TbankNotificationPayload;
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

export async function POST(req: Request) {
  let payload: TbankNotificationPayload;
  try {
    payload = await readNotificationPayload(req);
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (!verifyTbankNotificationToken(payload)) {
    console.warn("[billing:tbank-webhook] invalid token", {
      orderId: payload.OrderId,
      paymentId: payload.PaymentId,
      status: payload.Status,
    });
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  try {
    const order = await findBillingOrderByNotification(payload);
    if (!order) {
      console.warn("[billing:tbank-webhook] order not found", {
        orderId: payload.OrderId,
        paymentId: payload.PaymentId,
        status: payload.Status,
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const status = mapTbankStatusToOrderStatus(payload);
    await markBillingOrderFromNotification(order.id, payload, status);

    console.info("[billing:tbank-webhook] notification processed", {
      orderId: order.id,
      paymentId: payload.PaymentId,
      tbankStatus: payload.Status,
      mappedStatus: status,
      errorCode: payload.ErrorCode,
      amount: payload.Amount,
    });

    if (status === "refunded") {
      await revokeEntitlementForOrder(order.id);
      console.info("[billing:tbank-webhook] entitlement revoked", {
        orderId: order.id,
      });
      return ok();
    }

    if (!isTbankConfirmedPayment(payload)) {
      return ok();
    }

    const plan = getPlanById(order.plan_id);
    if (!plan) {
      console.error("[billing:tbank-webhook] unknown plan", {
        orderId: order.id,
        planId: order.plan_id,
      });
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const paidAmount = Number(payload.Amount);
    if (paidAmount !== order.amount || paidAmount !== getPlanAmountKopeks(plan)) {
      console.error("[billing:tbank-webhook] amount mismatch", {
        orderId: order.id,
        paidAmount,
        orderAmount: order.amount,
        planAmount: getPlanAmountKopeks(plan),
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    await grantEntitlementForOrder(order, plan);
    return ok();
  } catch (error) {
    console.error("[billing:tbank-webhook]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
