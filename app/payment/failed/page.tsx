import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canRetryPayment, paymentMethodLabel } from "@/lib/payments";
import { getSiteSettings } from "@/lib/settings";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment not completed",
  robots: { index: false, follow: false },
};

const REASONS: Record<string, string> = {
  verification: "We could not verify the payment signature, so nothing was confirmed.",
  network: "The connection dropped while we were confirming the payment.",
  declined: "The bank declined the payment.",
  cancelled: "You closed the payment window before finishing.",
  amount: "The paid amount did not match this order, so it was not confirmed.",
};

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; reason?: string }>;
}) {
  const { id, reason = "" } = await searchParams;
  const db = await refreshDb(0);
  const payment = (db.payments ?? []).find((row) => row.id === id);
  if (!payment) notFound();
  // A paid order must never show the failure page: an old or copied link would
  // tell a customer who already paid that the payment did not go through.
  if (payment.status === "paid") redirect(`/payment/success?id=${encodeURIComponent(payment.id)}`);
  const settings = getSiteSettings(db);
  const detail = REASONS[reason] ?? payment.failureReason ?? REASONS.verification;
  const retry = canRetryPayment(payment);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="card p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-2xl">!</span>
        <h1 className="display mt-3 text-2xl text-ink">Payment not completed</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {retry
            ? "Nothing was charged for this attempt. You can reopen the checkout and try another method."
            : "This order is already settled — no second charge was made."}
        </p>

        <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-slate-50/60 px-4 text-left">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Order</dt>
            <dd className="font-mono text-xs font-semibold text-ink">{payment.reference}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Amount</dt>
            <dd className="text-sm font-extrabold text-ink">
              {payment.currency === "USD"
                ? `$${Math.round(payment.amount).toLocaleString("en-US")}`
                : `₹${Math.round(payment.amount).toLocaleString("en-IN")}`}
            </dd>
          </div>
          {payment.method ? (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-xs font-semibold text-slate-500">Attempted with</dt>
              <dd className="text-xs font-semibold text-ink">{paymentMethodLabel(payment.method)}</dd>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">What happened</dt>
            <dd className="max-w-[65%] text-right text-xs leading-relaxed text-rose-700">{detail}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {retry ? (
            <Link href={`/checkout/${payment.id}`} className="btn btn-primary text-xs">
              Try the payment again
            </Link>
          ) : null}
          <Link href="/sponsor" className="btn btn-ghost text-xs">
            Back to sponsor page
          </Link>
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
          Still stuck? Email{" "}
          <a href={`mailto:${settings.supportEmail}`} className="font-semibold text-brand hover:underline">
            {settings.supportEmail}
          </a>{" "}
          with order {payment.reference} and we will check the payment with Razorpay.
        </p>
      </div>
    </div>
  );
}
