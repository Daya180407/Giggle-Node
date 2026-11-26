import { NextResponse } from "next/server";
import { completePayment, failPayment } from "@/lib/payment-flow";
import { onlinePaymentsEnabled, paymentMethodFromRazorpay, verifyRazorpaySignature } from "@/lib/payments";
import { fetchRazorpayPayment } from "@/lib/razorpay";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * The browser success callback. A payment is only confirmed when:
 * 1. the HMAC signature matches the saved key secret,
 * 2. Razorpay's own payment record says captured/authorized,
 * 3. the gateway amount matches the order amount.
 */
export async function POST(request: Request) {
  let body: {
    paymentId?: string;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const paymentId = String(body.paymentId ?? "");
  const gatewayPaymentId = String(body.razorpay_payment_id ?? "");
  const orderId = String(body.razorpay_order_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  if (!paymentId || !gatewayPaymentId || !orderId || !signature) {
    return NextResponse.json({ ok: false, error: "Incomplete payment response." }, { status: 400 });
  }

  const db = readDb();
  const settings = getSiteSettings(db);
  const payment = (db.payments ?? []).find((row) => row.id === paymentId);
  if (!payment) return NextResponse.json({ ok: false, error: "That order no longer exists." }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ ok: true, alreadyPaid: true });
  if (!onlinePaymentsEnabled(settings.payments)) {
    return NextResponse.json({ ok: false, error: "Online payment is turned off." }, { status: 409 });
  }
  if (!payment.razorpayOrderId || payment.razorpayOrderId !== orderId) {
    return NextResponse.json({ ok: false, error: "That payment does not belong to this order." }, { status: 409 });
  }

  const validSignature = await verifyRazorpaySignature({
    orderId,
    paymentId: gatewayPaymentId,
    signature,
    secret: settings.payments.razorpayKeySecret,
  });
  if (!validSignature) {
    failPayment(paymentId, "Signature verification failed");
    return NextResponse.json({ ok: false, error: "verification" }, { status: 400 });
  }

  const fetched = await fetchRazorpayPayment(settings.payments, gatewayPaymentId);
  if (!fetched.ok) {
    return NextResponse.json({ ok: false, error: "network" }, { status: 502 });
  }
  const gateway = fetched.data;
  const settled = gateway.status === "captured" || gateway.status === "authorized";
  if (!settled) {
    failPayment(paymentId, gateway.error_description ?? `Gateway status ${gateway.status}`);
    return NextResponse.json({ ok: false, error: "declined" }, { status: 402 });
  }
  if (gateway.order_id && gateway.order_id !== orderId) {
    return NextResponse.json({ ok: false, error: "That payment does not belong to this order." }, { status: 409 });
  }
  if (Math.round(gateway.amount) !== Math.round(payment.amount * 100)) {
    failPayment(paymentId, "Paid amount did not match the order");
    return NextResponse.json({ ok: false, error: "amount" }, { status: 409 });
  }

  const result = await completePayment(paymentId, {
    method: paymentMethodFromRazorpay(gateway.method) ?? "card",
    gatewayPaymentId,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error ?? "verify" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    reference: result.payment?.reference,
    slipQueued: result.slipQueued ?? false,
    slipDelivered: result.slipDelivered ?? false,
  });
}
