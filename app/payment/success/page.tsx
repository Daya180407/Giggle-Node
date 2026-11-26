import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paymentMethodLabel } from "@/lib/payments";
import { getSiteSettings } from "@/lib/settings";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment successful",
  robots: { index: false, follow: false },
};

function money(amount: number, currency: string): string {
  return currency === "USD"
    ? `$${Math.round(amount).toLocaleString("en-US")}`
    : `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const db = await refreshDb(0);
  const payment = (db.payments ?? []).find((row) => row.id === id);
  if (!payment) notFound();
  const settings = getSiteSettings(db);
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : null;
  const slipNote = payment.slipEmailedAt
    ? `A payment slip was emailed to ${payment.customerEmail}.`
    : `Your payment slip is queued for ${payment.customerEmail}; the admin panel shows its delivery status.`;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="card p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl">✓</span>
        <h1 className="display mt-3 text-2xl text-ink">Payment successful</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {payment.status === "paid"
            ? "Thank you — your sponsored placement is confirmed."
            : "This order is still being confirmed by the gateway. Refresh in a moment."}
        </p>

        <dl className="mt-5 divide-y divide-line rounded-2xl border border-line bg-slate-50/60 px-4 text-left">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Receipt no</dt>
            <dd className="font-mono text-xs font-semibold text-ink">{payment.reference}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Amount</dt>
            <dd className="text-sm font-extrabold text-ink">{money(payment.amount, payment.currency)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Method</dt>
            <dd className="text-xs font-semibold text-ink">
              {payment.method ? paymentMethodLabel(payment.method) : "—"}
              <span className="ml-1 font-normal text-muted">
                {payment.provider === "razorpay" ? "· Razorpay" : "· Manual"}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Date</dt>
            <dd className="text-xs text-ink">
              {paidAt
                ? paidAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "Pending"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-xs font-semibold text-slate-500">Placement</dt>
            <dd className="max-w-[65%] text-right text-xs leading-relaxed text-ink">{payment.description}</dd>
          </div>
        </dl>

        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-[11.5px] leading-relaxed text-emerald-800">
          {slipNote}
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary text-xs">
            Back to {settings.siteName}
          </Link>
          <Link href="/sponsor" className="btn btn-ghost text-xs">
            Sponsor page
          </Link>
        </div>
        <p className="mt-3 text-[10.5px] text-muted">
          Need a change? Email{" "}
          <a href={`mailto:${settings.supportEmail}`} className="font-semibold text-brand hover:underline">
            {settings.supportEmail}
          </a>{" "}
          with receipt {payment.reference}.
        </p>
      </div>
    </div>
  );
}
