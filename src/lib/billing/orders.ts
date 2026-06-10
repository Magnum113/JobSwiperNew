import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Limits, Plan } from "@/lib/plans";
import type { TbankNotificationPayload } from "./tbank";

export type BillingOrderStatus =
  | "created"
  | "payment_initialized"
  | "authorized"
  | "confirmed"
  | "refunded"
  | "failed"
  | "canceled"
  | "rejected"
  | "unknown";

export interface BillingOrderRow {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: BillingOrderStatus;
  tbank_payment_id: string | null;
  payment_url: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export async function logBillingEvent(
  orderId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("billing_events").insert({
    id: randomUUID(),
    order_id: orderId,
    event_type: eventType,
    payload,
  });
  if (error) {
    console.warn("[billing:event-log-failed]", {
      orderId,
      eventType,
      error: error.message,
    });
  }
}

export async function createBillingOrder(
  userId: string,
  plan: Plan,
  amountKopeks: number,
): Promise<BillingOrderRow> {
  const sb = getSupabaseAdmin();
  const userResult = await sb
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (userResult.error) throw new Error(userResult.error.message);

  const { data, error } = await sb
    .from("billing_orders")
    .insert({
      id: randomUUID(),
      user_id: userId,
      plan_id: plan.id,
      amount: amountKopeks,
      status: "created",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as BillingOrderRow;
}

export async function markBillingOrderInitialized(
  orderId: string,
  input: {
    paymentId: string;
    paymentUrl: string;
    rawPayload: Record<string, unknown>;
  },
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("billing_orders")
    .update({
      status: "payment_initialized",
      tbank_payment_id: input.paymentId,
      payment_url: input.paymentUrl,
      raw_payload: input.rawPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function findBillingOrderByNotification(
  payload: TbankNotificationPayload,
): Promise<BillingOrderRow | null> {
  const sb = getSupabaseAdmin();
  const orderId = payload.OrderId;
  const paymentId =
    payload.PaymentId === undefined || payload.PaymentId === null
      ? null
      : String(payload.PaymentId);

  if (orderId) {
    const { data, error } = await sb
      .from("billing_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as BillingOrderRow;
  }

  if (!paymentId) return null;

  const { data, error } = await sb
    .from("billing_orders")
    .select("*")
    .eq("tbank_payment_id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as BillingOrderRow) : null;
}

export async function findBillingOrderForUser(
  orderId: string,
  userId: string,
): Promise<BillingOrderRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("billing_orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data as BillingOrderRow) : null;
}

export function mapTbankStatusToOrderStatus(
  payload: TbankNotificationPayload,
): BillingOrderStatus {
  const success = payload.Success === true || payload.Success === "true";
  if (success && payload.Status === "CONFIRMED") {
    return "confirmed";
  }
  if (success && payload.Status === "AUTHORIZED") {
    return "authorized";
  }

  switch (payload.Status) {
    case "CANCELED":
      return "canceled";
    case "REJECTED":
      return "rejected";
    case "REFUNDED":
      return "refunded";
    case "DEADLINE_EXPIRED":
      return "failed";
    default:
      return "unknown";
  }
}

export async function markBillingOrderFromNotification(
  orderId: string,
  payload: TbankNotificationPayload,
  status: BillingOrderStatus,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("billing_orders")
    .update({
      status,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
      ...(status === "confirmed" ? { paid_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

export async function markBillingOrderStatus(
  orderId: string,
  input: {
    status: BillingOrderStatus;
    rawPayload?: Record<string, unknown>;
    paidAt?: string | null;
  },
): Promise<void> {
  const sb = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.rawPayload) patch.raw_payload = input.rawPayload;
  if (input.paidAt !== undefined) patch.paid_at = input.paidAt;

  const { error } = await sb
    .from("billing_orders")
    .update(patch)
    .eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function grantEntitlementForOrder(
  order: BillingOrderRow,
  plan: Plan,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  const { error } = await sb
    .from("user_entitlements")
    .upsert(
      {
        id: randomUUID(),
        user_id: order.user_id,
        order_id: order.id,
        responses_total: plan.responses,
        analyses_total: plan.analyses,
        resumes_total: plan.resumes,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "order_id", ignoreDuplicates: true },
    );

  if (error) throw new Error(error.message);
}

export async function revokeEntitlementForOrder(orderId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("user_entitlements")
    .delete()
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
}

export async function getActivePurchasedLimits(userId: string): Promise<Limits> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("user_entitlements")
    .select("responses_total, analyses_total, resumes_total")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString());
  if (error) throw new Error(error.message);

  return (data ?? []).reduce<Limits>(
    (acc, row) => ({
      responses: acc.responses + (Number(row.responses_total) || 0),
      analyses: acc.analyses + (Number(row.analyses_total) || 0),
      resumes: acc.resumes + (Number(row.resumes_total) || 0),
    }),
    { responses: 0, analyses: 0, resumes: 0 },
  );
}
