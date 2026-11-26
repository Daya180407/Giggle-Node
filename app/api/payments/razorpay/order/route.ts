import { NextResponse } from "next/server";
import { canRetryPayment, onlinePaymentsEnabled } from "@/lib/payments";
import { requestCountry } from "@/lib/payment-flow";
import { createRazorpayOrder } from "@/lib/razorpay";
import { getSiteSettings } from "@/lib/settings";
import { mutateDb, refreshDb } from "@/lib/store";
import { slotMeta } from "@/lib/sponsors";

export const dynamic = "force-dynamic";

/**
 * Creates (or reuses) the Razorpay order for one payable booking.
 * The amount always comes from the saved order, never from the browser.
 */
export async function POST(request: Request) {
  let body: { paymentId?: string };
  try {
    body = (await request.json()) as { paymentId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const paymentId = String(body.paymentId ?? "");
  if (!paymentId) return NextResponse.json({ ok: false, error: "Missing order." }, { status: 400 });

  const db = await refreshDb(0);
  const settings = getSiteSettings(db);
  if (!onlinePaymentsEnabled(settings.payments)) {
    return NextResponse.json({ ok: false, error: "Online payment is turned off." }, { status: 409 });
  }

  const payment = (db.payments ?? []).find((row) => row.id === paymentId);
  if (!payment) return NextResponse.json({ ok: false, error: "That order no longer exists." }, { status: 404 });
  if (payment.status === "paid") return NextResponse.json({ ok: false, error: "This order is already paid." }, { status: 409 });
  if (!canRetryPayment(payment) || payment.amount <= 0) {
    return NextResponse.json({ ok: false, error: "This order cannot be paid again." }, { status: 409 });
  }

  const sponsor = (db.sponsorRequests ?? []).find((row) => row.id === payment.sponsorRequestId);
  if (!sponsor) return NextResponse.json({ ok: false, error: "The booking behind this order is gone." }, { status: 409 });

  const country = await requestCountry();
  const created = await createRazorpayOrder(settings.payments, {
    amount: payment.amount,
    currency: payment.currency,
    receipt: payment.reference,
    notes: { paymentId: payment.id, reference: payment.reference, sponsorRequestId: payment.sponsorRequestId },
  });

  if (!created.ok) {
    mutateDb((draft) => {
      const current = getSiteSettings(draft);
      draft.settings = {
        ...current,
        payments: { ...current.payments, lastError: created.error.slice(0, 240) },
      };
    });
    return NextResponse.json({ ok: false, error: "Razorpay could not create the order. Please try again." }, { status: 502 });
  }

  mutateDb((draft) => {
    const row = (draft.payments ?? []).find((item) => item.id === payment.id);
    if (!row) return;
    row.razorpayOrderId = created.data.id;
    row.currency = created.data.currency === "USD" ? "USD" : created.data.currency === "INR" ? "INR" : row.currency;
    row.status = "created";
    row.failureReason = null;
    row.customerCountry = row.customerCountry || country;
    row.updatedAt = new Date().toISOString();
  });

  return NextResponse.json({
    ok: true,
    orderId: created.data.id,
    amount: created.data.amount,
    currency: created.data.currency,
    keyId: settings.payments.razorpayKeyId.trim(),
    name: settings.siteName,
    description: `${sponsor.company} · ${payment.description.split(" · ").slice(1).join(" · ") || slotMeta(sponsor.slot)?.short || "Sponsored placement"}`,
  });
}
