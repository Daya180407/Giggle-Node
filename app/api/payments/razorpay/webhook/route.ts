import { NextResponse } from "next/server";
import { completePayment, failPayment } from "@/lib/payment-flow";
import { paymentMethodFromRazorpay, verifyWebhookSignature } from "@/lib/payments";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook. It is the safety net for a closed browser tab: the order is
 * marked paid from the signed webhook even when the customer never returns to
 * the success page. Signature is checked against the admin-saved webhook secret.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const settings = getSiteSettings(readDb()).payments;

  if (!settings.razorpayWebhookSecret) {
    return NextResponse.json({ ok: false, error: "Webhook secret is not configured." }, { status: 503 });
  }
  if (!(await verifyWebhookSignature(raw, signature, settings.razorpayWebhookSecret))) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string | null;
          status?: string;
          amount?: number;
          method?: string | null;
          error_description?: string | null;
        };
      };
    };
  };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  if (!entity) return NextResponse.json({ ok: true, ignored: true });

  const db = readDb();
  const payment = entity.order_id
    ? (db.payments ?? []).find((row) => row.razorpayOrderId === entity.order_id)
    : undefined;
  if (!payment) return NextResponse.json({ ok: true, ignored: true });

  if (event.event === "payment.captured" || event.event === "order.paid" || entity.status === "captured") {
    if (Math.round(Number(entity.amount ?? 0)) !== Math.round(payment.amount * 100)) {
      return NextResponse.json({ ok: false, error: "Amount mismatch." }, { status: 409 });
    }
    const result = await completePayment(payment.id, {
      method: paymentMethodFromRazorpay(entity.method) ?? "card",
      gatewayPaymentId: entity.id ?? null,
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, reference: result.payment?.reference });
  }

  if (event.event === "payment.failed") {
    failPayment(payment.id, entity.error_description ?? "Gateway reported a failed payment");
  }

  return NextResponse.json({ ok: true });
}
