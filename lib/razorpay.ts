import "server-only";
import { amountInMinorUnits } from "./payments";
import type { PaymentSettings } from "./types";

/**
 * Minimal Razorpay REST client built on fetch, so it works on Node, Vercel and
 * Cloudflare Workers alike. Keys come from the admin panel and never leave the
 * server: callers only receive the gateway's own responses.
 */

const API = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "attempted" | "paid" | string;
  receipt?: string | null;
  notes?: Record<string, string>;
};

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  status: "created" | "authorized" | "captured" | "refunded" | "failed" | string;
  amount: number;
  currency: string;
  method?: string | null;
  email?: string | null;
  contact?: string | null;
  error_description?: string | null;
  error_reason?: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

function authHeader(settings: PaymentSettings): string {
  return `Basic ${btoa(`${settings.razorpayKeyId.trim()}:${settings.razorpayKeySecret.trim()}`)}`;
}

async function call<T>(settings: PaymentSettings, path: string, init?: RequestInit): Promise<Result<T>> {
  if (!settings.razorpayKeyId.trim() || !settings.razorpayKeySecret.trim()) {
    return { ok: false, error: "Razorpay keys are not configured in the admin panel." };
  }
  try {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        authorization: authHeader(settings),
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, error: `Razorpay ${response.status}: ${text.slice(0, 240)}`, status: response.status };
    }
    return { ok: true, data: JSON.parse(text) as T };
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { ok: false, error: detail.slice(0, 240) };
  }
}

/** Creates the order the browser checkout is opened with. Amount is in paise/cents. */
export async function createRazorpayOrder(
  settings: PaymentSettings,
  input: { amount: number; currency: "INR" | "USD"; receipt: string; notes?: Record<string, string> },
): Promise<Result<RazorpayOrder>> {
  const amount = amountInMinorUnits(input.amount, input.currency);
  if (amount < 100) return { ok: false, error: "The order amount is too small for Razorpay (minimum 1.00)." };
  return call<RazorpayOrder>(settings, "/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: input.currency,
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });
}

/** Reads the payment from Razorpay so the amount and status are never trusted from the browser. */
export async function fetchRazorpayPayment(
  settings: PaymentSettings,
  paymentId: string,
): Promise<Result<RazorpayPayment>> {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) return { ok: false, error: "That payment id is not valid." };
  return call<RazorpayPayment>(settings, `/payments/${encodeURIComponent(paymentId)}`);
}

/** Small credential probe for the admin panel ("Test keys"). */
export async function checkRazorpayKeys(
  settings: PaymentSettings,
): Promise<{ ok: boolean; error?: string; message?: string }> {
  const result = await call<{ count?: number }>(settings, "/orders?count=1");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, message: "Razorpay accepted the keys." };
}
