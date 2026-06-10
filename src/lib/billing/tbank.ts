import "server-only";
import { createHash, timingSafeEqual } from "crypto";

const DEFAULT_API_URL = "https://securepay.tinkoff.ru/v2";

type TbankScalar = string | number | boolean;
type TbankTokenPayload = Record<string, unknown>;

export interface TbankInitPaymentInput {
  orderId: string;
  amount: number;
  description: string;
  userId: string;
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
}

export interface TbankInitPaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface TbankNotificationPayload {
  TerminalKey?: string;
  OrderId?: string;
  Success?: boolean | string;
  Status?: string;
  PaymentId?: string | number;
  ErrorCode?: string | number;
  Amount?: string | number;
  Token?: string;
  [key: string]: unknown;
}

export const TBANK_SUCCESS_RESPONSE = "OK";

export class TbankError extends Error {
  constructor(
    message: string,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = "TbankError";
  }
}

export function getTbankConfig() {
  const terminalKey =
    process.env.TBANK_TERMINAL_KEY?.trim() ??
    process.env.TEST_TERMINAL_KEY?.trim();
  const password =
    process.env.TBANK_TERMINAL_PASSWORD?.trim() ??
    process.env.TEST_TERMINAL_PASSWORD?.trim();
  const apiUrl = (process.env.TBANK_API_URL ?? DEFAULT_API_URL).replace(
    /\/$/,
    "",
  );

  if (!terminalKey || !password) {
    throw new Error(
      "T-Bank acquiring is not configured: set TBANK_TERMINAL_KEY/TBANK_TERMINAL_PASSWORD or TEST_TERMINAL_KEY/TEST_TERMINAL_PASSWORD",
    );
  }

  return { terminalKey, password, apiUrl };
}

function isTokenScalar(value: unknown): value is TbankScalar {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function createTbankToken(
  payload: TbankTokenPayload,
  password = getTbankConfig().password,
): string {
  const tokenSource = Object.entries({ ...payload, Password: password })
    .filter(([key, value]) => {
      if (key === "Token" || key === "Receipt" || key === "DATA" || key === "Data") {
        return false;
      }
      return isTokenScalar(value);
    })
    .sort(([a], [b]) => compareAscii(a, b))
    .map(([, value]) => String(value))
    .join("");

  return createHash("sha256").update(tokenSource, "utf8").digest("hex");
}

export async function initTbankPayment(
  input: TbankInitPaymentInput,
): Promise<TbankInitPaymentResult> {
  const { terminalKey, password, apiUrl } = getTbankConfig();
  const payload: Record<string, TbankScalar> = {
    TerminalKey: terminalKey,
    Amount: input.amount,
    OrderId: input.orderId,
    Description: input.description,
    CustomerKey: input.userId,
    PayType: "O",
    Language: "ru",
    SuccessURL: input.successUrl,
    FailURL: input.failUrl,
    NotificationURL: input.notificationUrl,
  };

  const response = await fetch(`${apiUrl}/Init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      Token: createTbankToken(payload, password),
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok || !data) {
    throw new TbankError("T-Bank Init request failed", data);
  }

  if (data.Success !== true || typeof data.PaymentURL !== "string") {
    throw new TbankError("T-Bank payment was not initialized", data);
  }

  return {
    paymentId: String(data.PaymentId ?? ""),
    paymentUrl: data.PaymentURL,
    status: String(data.Status ?? "NEW"),
    raw: data,
  };
}

export function verifyTbankNotificationToken(
  payload: TbankNotificationPayload,
): boolean {
  if (!payload.Token) return false;

  const expected = createTbankToken(payload);
  const received = payload.Token;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isTbankConfirmedPayment(
  payload: TbankNotificationPayload,
): boolean {
  const success = payload.Success === true || payload.Success === "true";
  return (
    success &&
    payload.Status === "CONFIRMED" &&
    String(payload.ErrorCode ?? "0") === "0"
  );
}
