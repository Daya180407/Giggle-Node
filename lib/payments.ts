import type { Payment, PaymentProvider, PaymentSettings, PaymentStatus } from "./types";

/**
 * Payment rules that are pure functions on purpose: the checkout page, the admin
 * panel and the automated Q&A script all read the same behaviour from here.
 * Nothing in this file touches the database or a secret store.
 */

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  razorpayEnabled: false,
  /** the site starts on the manual invoice flow, exactly as before */
  manualEnabled: true,
  razorpayKeyId: "",
  razorpayKeySecret: "",
  razorpayWebhookSecret: "",
  upiIndiaOnly: true,
  autoBookPaid: true,
  manualUpiId: "",
  manualUpiName: "",
  manualBank: "",
  manualNote:
    "Pay by UPI or bank transfer, then email the reference to us. Your placement goes live once the transfer is confirmed.",
  currency: "INR",
  lastCheckedAt: null,
  lastError: null,
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  created: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_METHOD_LABELS: Record<"upi" | "card" | "manual", string> = {
  upi: "UPI",
  card: "Card / netbanking",
  manual: "Manual transfer",
};

export function paymentMethodLabel(method: "upi" | "card" | "manual"): string {
  return PAYMENT_METHOD_LABELS[method] ?? "Online";
}

/** Both halves of the Razorpay key pair are needed before checkout can open. */
export function razorpayConfigured(settings: PaymentSettings): boolean {
  return Boolean(settings.razorpayKeyId.trim() && settings.razorpayKeySecret.trim());
}

/** Online checkout is only live when an admin turned it on and the keys are saved. */
export function onlinePaymentsEnabled(settings: PaymentSettings): boolean {
  return settings.razorpayEnabled && razorpayConfigured(settings);
}

/** The payment options the checkout page offers, in display order. */
export function paymentModes(settings: PaymentSettings): PaymentProvider[] {
  const modes: PaymentProvider[] = [];
  if (onlinePaymentsEnabled(settings)) modes.push("razorpay");
  if (settings.manualEnabled) modes.push("manual");
  return modes;
}

/** What the public checkout page is allowed to know about the gateway keys. */
export function publicPaymentConfig(settings: PaymentSettings) {
  return {
    online: onlinePaymentsEnabled(settings),
    manual: settings.manualEnabled,
    keyId: onlinePaymentsEnabled(settings) ? settings.razorpayKeyId.trim() : "",
    currency: settings.currency,
    upiIndiaOnly: settings.upiIndiaOnly,
    manualUpiId: settings.manualUpiId.trim(),
    manualUpiName: settings.manualUpiName.trim(),
    manualBank: settings.manualBank.trim(),
    manualNote: settings.manualNote.trim(),
  };
}

/** Never render a saved secret back; the admin form only shows the last 4 characters. */
export function maskSecret(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "••••";
  return `${"•".repeat(Math.min(24, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

/** Amount in the smallest currency unit (paise / cents), the format Razorpay expects. */
export function amountInMinorUnits(amount: number, currency = "INR"): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * 100);
}

/** A price is payable only as a whole positive amount. */
export function payableAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(100_000_000, Math.round(amount * 100) / 100);
}

/**
 * UPI is an Indian rail. When the admin keeps UPI India-only, a visitor whose
 * country is unknown never sees it (cards still work everywhere).
 */
export function upiAllowed(country: string, upiIndiaOnly: boolean): boolean {
  if (!upiIndiaOnly) return true;
  return country.trim().toUpperCase() === "IN";
}

/** Country from the hosting platform's geo headers (Cloudflare or Vercel). */
export function countryFromHeaders(headers: { get(name: string): string | null }): string {
  const raw = headers.get("cf-ipcountry") ?? headers.get("x-vercel-ip-country") ?? "";
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : "";
}

/** Short reference printed on the slip and in the admin ledger. */
export function paymentReference(sequence: number): string {
  const value = Math.max(1, Math.floor(Number.isFinite(sequence) ? sequence : 1));
  return `GN-${String(value).padStart(6, "0")}`;
}

/** An order can be paid again only while no money has been captured. */
export function canRetryPayment(payment: Pick<Payment, "status">): boolean {
  return payment.status === "created" || payment.status === "failed" || payment.status === "cancelled";
}

export function isPaymentPaid(payment: Pick<Payment, "status">): boolean {
  return payment.status === "paid";
}

/** Razorpay instrument names folded into the two options the site advertises. */
export function paymentMethodFromRazorpay(method?: string | null): "upi" | "card" | null {
  if (!method) return null;
  const normalised = method.trim().toLowerCase();
  if (normalised === "upi") return "upi";
  if (normalised === "card" || normalised === "netbanking" || normalised === "wallet" || normalised === "emi") {
    return "card";
  }
  return null;
}

/* ------------------------------ signatures ------------------------------ */

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The exact string Razorpay signs for a successful checkout. */
export function razorpaySignaturePayload(orderId: string, paymentId: string): string {
  return `${orderId}|${paymentId}`;
}

/** Server-side signature check: the only proof that a success callback is genuine. */
export async function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): Promise<boolean> {
  const { orderId, paymentId, signature, secret } = input;
  if (!orderId || !paymentId || !signature || !secret) return false;
  try {
    const expected = await hmacSha256Hex(secret, razorpaySignaturePayload(orderId, paymentId));
    return constantTimeEqual(expected.toLowerCase(), signature.trim().toLowerCase());
  } catch {
    return false;
  }
}

/** Webhook bodies are signed with the separate webhook secret, over the raw body. */
export async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!body || !signature || !secret) return false;
  try {
    const expected = await hmacSha256Hex(secret, body);
    return constantTimeEqual(expected.toLowerCase(), signature.trim().toLowerCase());
  } catch {
    return false;
  }
}

/* --------------------------- slips & reporting --------------------------- */

export function paymentDescription(input: {
  company: string;
  targetName: string;
  slotLabel: string;
  listLabel: string;
  days?: number;
}): string {
  const company = input.company.trim() || "Sponsored placement";
  const days = input.days && input.days > 0 ? input.days : 30;
  return `${company} — ${input.targetName} · ${input.slotLabel} in ${input.listLabel} · ${days} days`;
}

/** Plain-text payment slip mailed to the advertiser after a confirmed payment. */
export function paymentSlipBody(input: {
  site: string;
  reference: string;
  date: string;
  customerName: string;
  customerEmail: string;
  description: string;
  amount: number;
  currency: "INR" | "USD";
  provider: PaymentProvider;
  method: "upi" | "card" | "manual" | null;
  gatewayPaymentId?: string | null;
  supportEmail: string;
}): string {
  const amount = formatPaymentMoney(input.amount, input.currency);
  const method = input.method ? PAYMENT_METHOD_LABELS[input.method] : input.provider === "manual" ? "Manual transfer" : "Online";
  const lines = [
    `Hi ${input.customerName || "there"},`,
    "",
    `Thanks — we received your payment for ${input.site}. This is your payment slip.`,
    "",
    `Receipt no:   ${input.reference}`,
    `Date:         ${input.date}`,
    `For:          ${input.description}`,
    `Amount paid:  ${amount}`,
    `Method:       ${method}`,
    `Gateway:      ${input.provider === "razorpay" ? "Razorpay" : "Manual transfer"}`,
  ];
  if (input.gatewayPaymentId) lines.push(`Payment ID:   ${input.gatewayPaymentId}`);
  lines.push(
    "",
    `Billed to:    ${input.customerName || input.customerEmail} <${input.customerEmail}>`,
    "",
    "Keep this slip for your records. Your sponsored placement is set up by our team; reply to this email for any change.",
    "",
    `— The ${input.site} team · ${input.supportEmail}`,
  );
  return lines.join("\n");
}

export function formatPaymentMoney(amount: number, currency: "INR" | "USD" = "INR"): string {
  const value = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return currency === "USD" ? `$${value.toLocaleString("en-US")}` : `₹${value.toLocaleString("en-IN")}`;
}

export type PaymentTotals = {
  paidTotal: number;
  paidCount: number;
  monthTotal: number;
  monthCount: number;
  openTotal: number;
  openCount: number;
  failedCount: number;
};

/** Admin dashboard summary. Only `paid` orders count as revenue. */
export function paymentTotals(payments: Payment[], now = new Date()): PaymentTotals {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const paid = payments.filter((payment) => payment.status === "paid");
  const thisMonth = paid.filter((payment) => {
    const at = new Date(payment.paidAt ?? payment.updatedAt).getTime();
    return Number.isFinite(at) && at >= monthStart;
  });
  // Only untouched orders are "awaiting payment"; failed attempts are reported
  // separately so the outstanding number never includes money that bounced.
  const open = payments.filter((payment) => payment.status === "created");
  return {
    paidTotal: paid.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    paidCount: paid.length,
    monthTotal: thisMonth.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    monthCount: thisMonth.length,
    openTotal: open.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    openCount: open.length,
    failedCount: payments.filter((payment) => payment.status === "failed").length,
  };
}
