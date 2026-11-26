import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { markPaymentPaidAction, savePaymentSettingsAction, testRazorpayKeysAction } from "@/app/actions";
import { requireAreaPage } from "@/lib/permissions";
import {
  formatPaymentMoney,
  maskSecret,
  onlinePaymentsEnabled,
  PAYMENT_STATUS_LABELS,
  paymentMethodLabel,
  paymentTotals,
  razorpayConfigured,
} from "@/lib/payments";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";
import type { PaymentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

const STATUS_STYLE: Record<PaymentStatus, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  created: "bg-amber-50 text-amber-700",
  failed: "bg-rose-50 text-rose-600",
  cancelled: "bg-slate-100 text-slate-500",
  refunded: "bg-sky-50 text-sky-700",
};

const ERRORS: Record<string, string> = {
  keyid: "That key id does not look like a Razorpay key. It starts with rzp_test_ or rzp_live_.",
  keys: "Add both the Razorpay key id and key secret before switching online payments on.",
  methods: "Keep at least one payment method on — online checkout or manual transfer.",
  test: "Razorpay rejected the saved keys. Check the key id and secret.",
  missing: "That payment order no longer exists.",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; paid?: string; error?: string }>;
}) {
  await requireAreaPage("payments");
  const { saved, paid, error } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const payments = settings.payments;
  const totals = paymentTotals(db.payments ?? []);
  const ledger = [...(db.payments ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host") ?? "gigglenode.com";
  const webhookUrl = `${proto}://${host}/api/payments/razorpay/webhook`;
  const online = onlinePaymentsEnabled(payments);
  const defaultCurrency = payments.currency;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Revenue</p>
          <h2 className="display mt-1 text-2xl text-ink">Payments &amp; checkout</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
            Turn Razorpay on when you are ready, keep the manual invoice flow as a fallback, and manage every booking
            order from one ledger. Razorpay keys stay on the server.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`chip ${online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {online ? "Razorpay live" : "Razorpay off"}
          </span>
          <span className={`chip ${payments.manualEnabled ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {payments.manualEnabled ? "Manual on" : "Manual off"}
          </span>
          <Link href="/sponsor" className="btn btn-ghost text-xs">
            Open sponsor page ↗
          </Link>
        </div>
      </div>

      {saved === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Payment settings saved and live.
        </div>
      ) : null}
      {saved === "test" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Razorpay accepted the saved keys.
        </div>
      ) : null}
      {paid === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Payment marked paid. The placement is booked, staff were notified and the payment slip is queued.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          {ERRORS[error] ?? "That change could not be saved."}
        </div>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Collected (all time)", value: formatPaymentMoney(totals.paidTotal, payments.currency), hint: `${totals.paidCount} paid orders` },
          { label: "This month", value: formatPaymentMoney(totals.monthTotal, payments.currency), hint: `${totals.monthCount} paid this month` },
          { label: "Awaiting payment", value: formatPaymentMoney(totals.openTotal, payments.currency), hint: `${totals.openCount} open orders` },
          { label: "Failed attempts", value: String(totals.failedCount), hint: "Retry links stay open" },
        ].map((card) => (
          <div key={card.label} className="card p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink">{card.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{card.hint}</p>
          </div>
        ))}
      </section>

      <form action={savePaymentSettingsAction} className="space-y-4">
        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Razorpay online checkout</h3>
              <p className="text-xs text-muted">
                UPI and cards through Razorpay. When this is off the checkout only shows the manual instructions.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="razorpayEnabled"
                defaultChecked={payments.razorpayEnabled}
                className="h-4 w-4 accent-indigo-600"
              />
              Enable Razorpay
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="razorpayKeyId">
                Key id
              </label>
              <input
                id="razorpayKeyId"
                name="razorpayKeyId"
                defaultValue={payments.razorpayKeyId}
                className="field font-mono text-xs"
                placeholder="rzp_live_xxxxxxxxxxxx"
                maxLength={80}
                spellCheck={false}
                autoComplete="off"
              />
              <p className="mt-1 text-[11px] text-muted">Razorpay Dashboard → Account &amp; Settings → API Keys.</p>
            </div>
            <div>
              <label className="label" htmlFor="razorpayKeySecret">
                Key secret
              </label>
              <input
                id="razorpayKeySecret"
                name="razorpayKeySecret"
                type="password"
                defaultValue=""
                className="field font-mono text-xs"
                placeholder={payments.razorpayKeySecret ? "Saved — leave blank to keep it" : "Key secret"}
                maxLength={200}
                autoComplete="new-password"
              />
              {payments.razorpayKeySecret ? (
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">Stored: {maskSecret(payments.razorpayKeySecret)}</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-rose-600">
                    <input type="checkbox" name="clearRazorpaySecret" className="h-3.5 w-3.5 accent-rose-600" />
                    Remove
                  </label>
                </div>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="razorpayWebhookSecret">
                Webhook secret
              </label>
              <input
                id="razorpayWebhookSecret"
                name="razorpayWebhookSecret"
                type="password"
                defaultValue=""
                className="field font-mono text-xs"
                placeholder={payments.razorpayWebhookSecret ? "Saved — leave blank to keep it" : "Webhook secret"}
                maxLength={200}
                autoComplete="new-password"
              />
              {payments.razorpayWebhookSecret ? (
                <label className="mt-1 flex items-center gap-1.5 text-[11px] text-rose-600">
                  <input type="checkbox" name="clearWebhookSecret" className="h-3.5 w-3.5 accent-rose-600" />
                  Remove the stored webhook secret
                </label>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="currency">
                Checkout currency
              </label>
              <select id="currency" name="currency" defaultValue={defaultCurrency} className="field text-xs">
                <option value="INR">INR (₹) — Razorpay UPI &amp; cards</option>
                <option value="USD">USD ($) — international cards</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <span className="label">Webhook URL — paste this in Razorpay → Settings → Webhooks</span>
              <code className="block select-all break-all rounded-lg border border-line bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {webhookUrl}
              </code>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Subscribe to <strong>payment.captured</strong> and <strong>payment.failed</strong>. The webhook confirms
                payments even when the buyer closes the browser, and signs every request with the secret above.
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-3 text-xs">
              <input
                type="checkbox"
                name="upiIndiaOnly"
                defaultChecked={payments.upiIndiaOnly}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block font-semibold">UPI for Indian visitors only</span>
                <span className="text-[11px] leading-relaxed text-muted">
                  The UPI method is hidden outside India; cards and netbanking remain available worldwide.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-3 text-xs">
              <input
                type="checkbox"
                name="autoBookPaid"
                defaultChecked={payments.autoBookPaid}
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span>
                <span className="block font-semibold">Book the placement as soon as payment succeeds</span>
                <span className="text-[11px] leading-relaxed text-muted">
                  Off = the request waits for an admin approval in Sponsors &amp; Ads.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-slate-50/70 px-3 py-2 text-[11px] text-slate-600">
            <span>
              {razorpayConfigured(payments) ? "Keys saved on the server." : "No Razorpay keys saved yet."}
              {payments.lastCheckedAt ? ` Last checked ${new Date(payments.lastCheckedAt).toLocaleString("en-IN")}.` : ""}
            </span>
            <span className={payments.lastError ? "font-semibold text-rose-600" : "text-emerald-700"}>
              {payments.lastError ? payments.lastError.slice(0, 120) : "No gateway errors."}
            </span>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold">Manual invoice / bank transfer</h3>
              <p className="text-xs text-muted">Keep this on while Razorpay is being set up, or as a fallback.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="manualEnabled"
                defaultChecked={payments.manualEnabled}
                className="h-4 w-4 accent-indigo-600"
              />
              Enable manual payment
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="manualUpiId">
                UPI ID
              </label>
              <input
                id="manualUpiId"
                name="manualUpiId"
                defaultValue={payments.manualUpiId}
                className="field text-xs"
                placeholder="gigglenode@okhdfcbank"
                maxLength={120}
                spellCheck={false}
              />
            </div>
            <div>
              <label className="label" htmlFor="manualUpiName">
                UPI account name
              </label>
              <input
                id="manualUpiName"
                name="manualUpiName"
                defaultValue={payments.manualUpiName}
                className="field text-xs"
                placeholder="GiggleNode Media"
                maxLength={120}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="manualBank">
                Bank transfer details
              </label>
              <textarea
                id="manualBank"
                name="manualBank"
                rows={3}
                defaultValue={payments.manualBank}
                className="field text-xs"
                maxLength={500}
                placeholder={"Account name: GiggleNode Media\nA/c no: 1234567890\nIFSC: HDFC0000123\nBank: HDFC Bank"}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="manualNote">
                Instructions shown on checkout
              </label>
              <textarea
                id="manualNote"
                name="manualNote"
                rows={2}
                defaultValue={payments.manualNote}
                className="field text-xs"
                maxLength={400}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-relaxed text-muted">
            Manual orders are marked paid from the ledger below once the transfer arrives. That books the placement and
            emails the payment slip, exactly like an online payment.
          </p>
          <div className="flex gap-2">
            <button className="btn btn-primary text-xs">Save payment settings</button>
          </div>
        </div>
      </form>

      <form action={testRazorpayKeysAction}>
        <button className="btn btn-ghost text-xs">Test the saved Razorpay keys</button>
      </form>

      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Payment ledger</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Every checkout order, online or manual. Amounts come from the sponsor quote saved with the request.
            </p>
          </div>
          <span className="chip bg-slate-100 text-slate-500">{ledger.length} orders</span>
        </div>

        {ledger.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            No orders yet. They appear here when an advertiser submits the sponsor form with online payment or when you
            mark a manual transfer paid.
          </p>
        ) : (
          <div className="admin-table-scroll mt-2">
            <table className="admin-table w-full text-[11px] sm:text-xs">
              <thead>
                <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ledger.slice(0, 80).map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2 pr-3 font-mono text-[11px]">
                      <Link href={`/checkout/${payment.id}`} className="font-semibold text-brand hover:underline">
                        {payment.reference}
                      </Link>
                      <span className="block max-w-[220px] truncate text-[10px] text-muted">{payment.description}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="block font-medium text-ink">{payment.customerName}</span>
                      <a href={`mailto:${payment.customerEmail}`} className="text-[10px] text-brand hover:underline">
                        {payment.customerEmail}
                      </a>
                    </td>
                    <td className="py-2 pr-3 font-semibold text-ink">
                      {formatPaymentMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="block text-[11px] font-medium">
                        {payment.method ? paymentMethodLabel(payment.method) : "—"}
                      </span>
                      <span className="text-[10px] text-muted">
                        {payment.provider === "razorpay" ? "Razorpay" : "Manual"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`chip ${STATUS_STYLE[payment.status]}`}>{PAYMENT_STATUS_LABELS[payment.status]}</span>
                    </td>
                    <td className="py-2 pr-3 text-[10.5px] text-muted">
                      {(payment.paidAt ?? payment.createdAt).slice(0, 10)}
                    </td>
                    <td className="py-2 text-right">
                      {payment.status !== "paid" ? (
                        <form action={markPaymentPaidAction}>
                          <input type="hidden" name="id" value={payment.id} />
                          <button className="text-[11px] font-semibold text-brand hover:underline">Mark paid</button>
                        </form>
                      ) : (
                        <span className="text-[10px] text-emerald-700">
                          {payment.slipEmailedAt ? "Slip sent" : "Slip queued"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-4 text-[11px] leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-700">How the checkout works</p>
        <p className="mt-1">
          Advertiser submits <Link href="/sponsor" className="font-semibold text-brand">/sponsor</Link> → an order is
          created with the quoted price → the advertiser pays on Razorpay (UPI or card) → our server verifies the
          signature and the gateway amount → the placement is booked, staff get a notification and the payment slip is
          emailed. With Razorpay off, the same order shows the manual UPI/bank instructions instead.
        </p>
      </section>
    </div>
  );
}
