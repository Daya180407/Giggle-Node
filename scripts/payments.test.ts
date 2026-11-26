import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  amountInMinorUnits,
  canRetryPayment,
  countryFromHeaders,
  DEFAULT_PAYMENT_SETTINGS,
  formatPaymentMoney,
  maskSecret,
  onlinePaymentsEnabled,
  payableAmount,
  paymentDescription,
  paymentMethodFromRazorpay,
  paymentModes,
  paymentReference,
  paymentSlipBody,
  paymentTotals,
  publicPaymentConfig,
  razorpayConfigured,
  razorpaySignaturePayload,
  upiAllowed,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "../lib/payments";
import { getSiteSettings } from "../lib/settings";
import { money, sponsorCategoryPrice, sponsorQuote } from "../lib/sponsors";
import type { DB, Payment, PaymentSettings } from "../lib/types";

function settings(patch: Partial<PaymentSettings> = {}): PaymentSettings {
  return { ...DEFAULT_PAYMENT_SETTINGS, ...patch };
}

function payment(patch: Partial<Payment>): Payment {
  return {
    id: "pay_test",
    reference: "GN-000001",
    provider: "razorpay",
    purpose: "sponsor",
    sponsorRequestId: "spr_test",
    description: "Acme — Cursor · After #5 in All AI leaderboard · 30 days",
    amount: 9000,
    currency: "INR",
    customerName: "Asha",
    customerEmail: "asha@example.com",
    customerCountry: "IN",
    method: null,
    status: "created",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    verifiedAt: null,
    failureReason: null,
    slipEmailedAt: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
    updatedAt: new Date().toISOString(),
    ...patch,
  };
}

/* ------------------------------- amounts ------------------------------- */

test("amountInMinorUnits converts to paise and cents", () => {
  assert.equal(amountInMinorUnits(1499.5, "INR"), 149950);
  assert.equal(amountInMinorUnits(20, "USD"), 2000);
  assert.equal(amountInMinorUnits(0), 0);
  assert.equal(amountInMinorUnits(-50), 0);
  assert.equal(amountInMinorUnits(Number.NaN), 0);
});

test("payableAmount rejects junk and rounds to two decimals", () => {
  assert.equal(payableAmount("500"), 500);
  assert.equal(payableAmount(-1), 0);
  assert.equal(payableAmount("abc"), 0);
  assert.equal(payableAmount(12.345), 12.35);
  assert.equal(payableAmount(100_000_000_000), 100_000_000);
});

test("money formatting uses Indian and US grouping", () => {
  assert.equal(formatPaymentMoney(150000, "INR"), "₹1,50,000");
  assert.equal(formatPaymentMoney(150000, "USD"), "$150,000");
  assert.equal(money(150000, "INR"), "₹1,50,000");
});

/* -------------------------------- methods ------------------------------- */

test("UPI is Indian-only unless the admin opens it up", () => {
  assert.equal(upiAllowed("IN", true), true);
  assert.equal(upiAllowed("in", true), true);
  assert.equal(upiAllowed("US", true), false);
  assert.equal(upiAllowed("", true), false);
  assert.equal(upiAllowed("US", false), true);
});

test("country detection reads Cloudflare and Vercel headers", () => {
  const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });
  assert.equal(countryFromHeaders(headers({ "cf-ipcountry": "in" })), "IN");
  assert.equal(countryFromHeaders(headers({ "x-vercel-ip-country": "US" })), "US");
  assert.equal(countryFromHeaders(headers({ "cf-ipcountry": "XX" })), "");
  assert.equal(countryFromHeaders(headers({ "cf-ipcountry": "India" })), "");
  assert.equal(countryFromHeaders(headers({})), "");
});

test("Razorpay needs both halves of the key pair", () => {
  assert.equal(razorpayConfigured(settings()), false);
  assert.equal(razorpayConfigured(settings({ razorpayKeyId: "rzp_test_abc" })), false);
  assert.equal(razorpayConfigured(settings({ razorpayKeySecret: "secret" })), false);
  assert.equal(razorpayConfigured(settings({ razorpayKeyId: "rzp_test_abc", razorpayKeySecret: "secret" })), true);
});

test("online checkout stays off until enabled with keys", () => {
  assert.equal(onlinePaymentsEnabled(settings()), false);
  assert.equal(onlinePaymentsEnabled(settings({ razorpayEnabled: true })), false);
  assert.equal(
    onlinePaymentsEnabled(settings({ razorpayEnabled: true, razorpayKeyId: "rzp_test_abc", razorpayKeySecret: "s" })),
    true,
  );
  assert.equal(
    onlinePaymentsEnabled(settings({ razorpayEnabled: false, razorpayKeyId: "rzp_test_abc", razorpayKeySecret: "s" })),
    false,
  );
});

test("payment modes follow the admin switches", () => {
  const keys = { razorpayKeyId: "rzp_test_abc", razorpayKeySecret: "s" };
  assert.deepEqual(paymentModes(settings()), ["manual"]);
  assert.deepEqual(paymentModes(settings({ razorpayEnabled: true })), ["manual"]);
  assert.deepEqual(paymentModes(settings({ razorpayEnabled: true, ...keys })), ["razorpay", "manual"]);
  assert.deepEqual(paymentModes(settings({ manualEnabled: false, razorpayEnabled: true, ...keys })), ["razorpay"]);
  assert.deepEqual(paymentModes(settings({ manualEnabled: false })), []);
});

test("public payment config never leaks a secret", () => {
  const config = publicPaymentConfig(
    settings({
      razorpayEnabled: true,
      razorpayKeyId: "rzp_test_public",
      razorpayKeySecret: "super-secret-value",
      razorpayWebhookSecret: "webhook-secret-value",
      manualUpiId: " giggle@okhdfc ",
    }),
  );
  assert.equal(config.keyId, "rzp_test_public");
  assert.equal(config.manualUpiId, "giggle@okhdfc");
  const serialised = JSON.stringify(config);
  assert.equal(serialised.includes("super-secret-value"), false);
  assert.equal(serialised.includes("webhook-secret-value"), false);
});

test("maskSecret keeps only the tail and never the whole value", () => {
  assert.equal(maskSecret(""), "");
  assert.equal(maskSecret("abcd"), "••••");
  const masked = maskSecret("rzp_live_abcdef123456");
  assert.ok(masked.endsWith("3456"));
  assert.equal(masked.includes("abcdef123456"), false);
});

test("payment method names fold into UPI and card", () => {
  assert.equal(paymentMethodFromRazorpay("upi"), "upi");
  assert.equal(paymentMethodFromRazorpay("CARD"), "card");
  assert.equal(paymentMethodFromRazorpay("netbanking"), "card");
  assert.equal(paymentMethodFromRazorpay("wallet"), "card");
  assert.equal(paymentMethodFromRazorpay("paylater"), null);
  assert.equal(paymentMethodFromRazorpay(null), null);
});

/* ------------------------------ references ------------------------------ */

test("payment references are stable and zero padded", () => {
  assert.equal(paymentReference(1), "GN-000001");
  assert.equal(paymentReference(42), "GN-000042");
  assert.equal(paymentReference(1234567), "GN-1234567");
  assert.equal(paymentReference(0), "GN-000001");
  assert.equal(paymentReference(Number.NaN), "GN-000001");
});

test("only unsettled orders can be retried", () => {
  assert.equal(canRetryPayment({ status: "created" }), true);
  assert.equal(canRetryPayment({ status: "failed" }), true);
  assert.equal(canRetryPayment({ status: "cancelled" }), true);
  assert.equal(canRetryPayment({ status: "paid" }), false);
  assert.equal(canRetryPayment({ status: "refunded" }), false);
});

/* ------------------------------ signatures ------------------------------ */

test("Razorpay signature verification matches an independent HMAC", async () => {
  const secret = "test_secret_key";
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  const signature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  assert.equal(razorpaySignaturePayload(orderId, paymentId), "order_ABC123|pay_XYZ789");
  assert.equal(await verifyRazorpaySignature({ orderId, paymentId, signature, secret }), true);
  assert.equal(await verifyRazorpaySignature({ orderId, paymentId, signature: signature.toUpperCase(), secret }), true);
  assert.equal(await verifyRazorpaySignature({ orderId, paymentId, signature: "deadbeef", secret }), false);
  assert.equal(await verifyRazorpaySignature({ orderId, paymentId, signature, secret: "other" }), false);
  assert.equal(await verifyRazorpaySignature({ orderId, paymentId, signature, secret: "" }), false);
  assert.equal(await verifyRazorpaySignature({ orderId: "", paymentId, signature, secret }), false);
});

test("webhook signatures verify against the raw body", async () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(await verifyWebhookSignature(body, signature, secret), true);
  assert.equal(await verifyWebhookSignature(`${body} `, signature, secret), false);
  assert.equal(await verifyWebhookSignature(body, null, secret), false);
  assert.equal(await verifyWebhookSignature(body, signature, ""), false);
});

/* --------------------------- slips & totals --------------------------- */

test("payment description defaults to a 30-day booking", () => {
  const text = paymentDescription({
    company: "Acme AI",
    targetName: "Cursor",
    slotLabel: "After #5",
    listLabel: "All AI leaderboard",
  });
  assert.equal(text, "Acme AI — Cursor · After #5 in All AI leaderboard · 30 days");
  assert.ok(paymentDescription({ company: "", targetName: "X", slotLabel: "S", listLabel: "L", days: 7 }).includes("7 days"));
});

test("payment slip contains every field a customer needs", () => {
  const slip = paymentSlipBody({
    site: "GiggleNode",
    reference: "GN-000007",
    date: "26 Nov 2026",
    customerName: "Asha",
    customerEmail: "asha@example.com",
    description: "Acme AI — Cursor · After #5 · 30 days",
    amount: 9000,
    currency: "INR",
    provider: "razorpay",
    method: "upi",
    gatewayPaymentId: "pay_ABC",
    supportEmail: "hello@gigglenode.com",
  });
  for (const expected of ["GN-000007", "26 Nov 2026", "₹9,000", "UPI", "Razorpay", "pay_ABC", "hello@gigglenode.com", "Asha"]) {
    assert.ok(slip.includes(expected), `slip is missing ${expected}`);
  }
  assert.equal(slip.includes("undefined"), false);
});

test("revenue totals count only paid orders", () => {
  const now = new Date("2026-11-26T10:00:00Z");
  const thisMonth = new Date("2026-11-10T10:00:00Z").toISOString();
  const lastMonth = new Date("2026-10-10T10:00:00Z").toISOString();
  const totals = paymentTotals(
    [
      payment({ id: "a", status: "paid", amount: 9000, paidAt: thisMonth, updatedAt: thisMonth }),
      payment({ id: "b", status: "paid", amount: 15000, paidAt: lastMonth, updatedAt: lastMonth }),
      payment({ id: "c", status: "created", amount: 3800 }),
      payment({ id: "d", status: "failed", amount: 2200 }),
      payment({ id: "e", status: "refunded", amount: 5000 }),
    ],
    now,
  );
  assert.equal(totals.paidTotal, 24000);
  assert.equal(totals.paidCount, 2);
  assert.equal(totals.monthTotal, 9000);
  assert.equal(totals.monthCount, 1);
  assert.equal(totals.openTotal, 3800);
  assert.equal(totals.openCount, 1);
  assert.equal(totals.failedCount, 1);
});

/* ------------------------- settings + sponsor quote ------------------------- */

test("site settings default to the manual flow and add payment fields", () => {
  const oldDb = { settings: { siteName: "GiggleNode" } } as unknown as DB;
  const merged = getSiteSettings(oldDb);
  assert.equal(merged.payments.manualEnabled, true);
  assert.equal(merged.payments.razorpayEnabled, false);
  assert.equal(merged.payments.upiIndiaOnly, true);
  assert.equal(merged.payments.autoBookPaid, true);
  assert.equal(merged.payments.currency, "INR");
  assert.equal(merged.security.magicLink, true);
});

test("saved payment settings merge over new defaults", () => {
  const db = {
    settings: {
      siteName: "GiggleNode",
      payments: { razorpayEnabled: true, razorpayKeyId: "rzp_test_x", razorpayKeySecret: "y", currency: "USD" },
    },
  } as unknown as DB;
  const merged = getSiteSettings(db);
  assert.equal(merged.payments.razorpayEnabled, true);
  assert.equal(merged.payments.currency, "USD");
  // Fields the admin never saved keep their defaults instead of becoming undefined.
  assert.equal(merged.payments.upiIndiaOnly, true);
  assert.equal(merged.payments.manualNote.length > 0, true);
  assert.equal(merged.payments.razorpayWebhookSecret, "");
});

test("category top-3 quotes fall back to the shared slot price", () => {
  const db = { sponsorPrices: { top3: 15000, list5: 9000 }, sponsorCategoryPrices: { coding: 21000 } } as unknown as DB;
  assert.equal(sponsorQuote(db, "top3", "coding"), 21000);
  assert.equal(sponsorQuote(db, "top3", "writing"), 15000);
  assert.equal(sponsorQuote(db, "list5", "coding"), 9000);
  assert.equal(sponsorCategoryPrice(db, "unknown"), 15000);
});
