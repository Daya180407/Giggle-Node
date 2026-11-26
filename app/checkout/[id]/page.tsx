import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CheckoutPay from "@/components/CheckoutPay";
import { requestCountry } from "@/lib/payment-flow";
import { paymentModes, publicPaymentConfig, upiAllowed } from "@/lib/payments";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your sponsored placement booking.",
  robots: { index: false, follow: false },
};

function money(amount: number, currency: string): string {
  return currency === "USD"
    ? `$${Math.round(amount).toLocaleString("en-US")}`
    : `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const payment = (db.payments ?? []).find((row) => row.id === id);
  if (!payment) notFound();
  if (payment.status === "paid") redirect(`/payment/success?id=${encodeURIComponent(payment.id)}`);

  const settings = getSiteSettings(db);
  const config = publicPaymentConfig(settings.payments);
  const modes = paymentModes(settings.payments);
  const country = await requestCountry();
  const upiAvailable = upiAllowed(country || payment.customerCountry, config.upiIndiaOnly);
  const request = (db.sponsorRequests ?? []).find((row) => row.id === payment.sponsorRequestId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-center justify-between gap-2">
        <Link href="/sponsor" className="text-xs font-semibold text-brand hover:underline">
          ← Back to sponsor
        </Link>
        <span className="chip bg-slate-100 text-slate-600">Order {payment.reference}</span>
      </div>

      <div className="card mt-3 p-5 sm:p-6">
        <span className="eyebrow">Checkout</span>
        <h1 className="display mt-1 text-2xl text-ink">Complete your booking</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {request ? `${request.company} · 30-day sponsored placement` : "Sponsored placement"} on {settings.siteName}.
        </p>

        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-slate-50/60 px-4">
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Placement</dt>
            <dd className="max-w-[65%] text-right text-xs font-medium leading-relaxed text-ink">{payment.description}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Billed to</dt>
            <dd className="max-w-[65%] text-right text-xs font-medium text-ink">
              {payment.customerName}
              <span className="block text-[11px] font-normal text-muted">{payment.customerEmail}</span>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Reference</dt>
            <dd className="font-mono text-xs text-ink">{payment.reference}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm font-bold text-ink">Total due</dt>
            <dd className="text-lg font-extrabold text-ink">{money(payment.amount, payment.currency)}</dd>
          </div>
        </dl>

        {modes.length ? (
          <CheckoutPay
            payment={{
              id: payment.id,
              reference: payment.reference,
              amount: payment.amount,
              currency: payment.currency,
              description: payment.description,
              customerName: payment.customerName,
              customerEmail: payment.customerEmail,
            }}
            config={config}
            siteName={settings.siteName}
            upiAvailable={upiAvailable}
            country={country}
          />
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            Online payment is paused and no manual details are set. Please email{" "}
            <a href={`mailto:${settings.supportEmail}`} className="font-semibold underline">
              {settings.supportEmail}
            </a>{" "}
            and we will send an invoice.
          </div>
        )}

        <p className="mt-4 text-[10.5px] leading-relaxed text-muted">
          Payments are processed by Razorpay. GiggleNode never sees or stores your card number, CVV or UPI PIN. Every
          successful payment is confirmed on our server and followed by a payment slip email.
        </p>
      </div>
    </div>
  );
}
