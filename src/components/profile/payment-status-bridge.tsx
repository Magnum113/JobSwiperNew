"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { pullState } from "@/lib/db-sync";
import { useAppStore } from "@/lib/store/use-app-store";
import { ANALYTICS_GOALS, trackGoal } from "@/lib/analytics";

interface BillingOrderResponse {
  status?: string;
  error?: string;
}

async function fetchOrderStatus(orderId: string): Promise<string | null> {
  const res = await fetch(
    `/api/billing/order?orderId=${encodeURIComponent(orderId)}`,
    { cache: "no-store" },
  );
  const data = (await res.json().catch(() => null)) as
    | BillingOrderResponse
    | null;
  if (!res.ok) {
    throw new Error(data?.error ?? "Не удалось проверить платёж");
  }
  return data?.status ?? null;
}

export function PaymentStatusBridge() {
  const userId = useAppStore((s) => s.userId);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrateFromServer = useAppStore((s) => s.hydrateFromServer);

  useEffect(() => {
    if (!hydrated || !userId) return;

    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const orderId = params.get("orderId");
    if (!payment) return;

    window.history.replaceState(null, "", window.location.pathname);

    if (payment === "fail") {
      trackGoal(ANALYTICS_GOALS.paymentReturnFail, {
        order_id: orderId ?? "unknown",
      });
      trackGoal(ANALYTICS_GOALS.paymentFail, {
        order_id: orderId ?? "unknown",
        stage: "bank_return",
      });
      toast.error("Оплата не завершена");
      return;
    }

    if (payment !== "success" || !orderId) return;
    const confirmedOrderId = orderId;
    trackGoal(ANALYTICS_GOALS.paymentReturnSuccess, {
      order_id: confirmedOrderId,
    });

    toast.loading("Проверяем оплату", { id: "payment-status" });

    async function verifyPayment() {
      for (let attempt = 0; attempt < 6; attempt++) {
        if (cancelled) return;
        try {
          const status = await fetchOrderStatus(confirmedOrderId);
          if (status === "confirmed") {
            const state = await pullState(userId);
            if (!cancelled && state) hydrateFromServer(state);
            trackGoal(ANALYTICS_GOALS.paymentSuccess, {
              order_id: confirmedOrderId,
              status,
            });
            toast.success("Пакет лимитов активирован", {
              id: "payment-status",
            });
            return;
          }

          if (status === "refunded") {
            trackGoal(ANALYTICS_GOALS.paymentFail, {
              order_id: confirmedOrderId,
              status,
              stage: "status_check",
            });
            toast.error("Платёж возвращён", {
              id: "payment-status",
              description:
                "Банк прислал статус возврата. Для успешного теста используйте карту с успешным сценарием оплаты.",
            });
            return;
          }

          if (
            status === "failed" ||
            status === "canceled" ||
            status === "rejected"
          ) {
            trackGoal(ANALYTICS_GOALS.paymentFail, {
              order_id: confirmedOrderId,
              status,
              stage: "status_check",
            });
            toast.error("Оплата не завершена", { id: "payment-status" });
            return;
          }
        } catch (error) {
          if (attempt >= 5) {
            trackGoal(ANALYTICS_GOALS.paymentCheckError, {
              order_id: confirmedOrderId,
              error_message:
                error instanceof Error ? error.message : "status_check_failed",
            });
            toast.error(
              error instanceof Error
                ? error.message
                : "Не удалось проверить платёж",
              { id: "payment-status" },
            );
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (!cancelled) {
        trackGoal(ANALYTICS_GOALS.paymentProcessing, {
          order_id: confirmedOrderId,
        });
        toast("Платёж обрабатывается", {
          id: "payment-status",
          description:
            "Если деньги списались, лимиты появятся после уведомления банка.",
        });
      }
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [hydrateFromServer, hydrated, userId]);

  return null;
}
