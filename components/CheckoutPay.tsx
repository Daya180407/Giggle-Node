"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export type CheckoutPayment = {
  id: string;
  reference: string;
  amount: number;
  currency: "INR" | "USD";
  description: string;
  customerName: string;
  customerEmail: string;
};

export type CheckoutConfig = {
  online: boolean;
  manual: boolean;
  upiIndiaOnly: boolean;
  manualUpiId: string;
  manualUpiName: string;
  manualBank: string;
  manualNote: string;
};

function money(amount: number, currency: string): string {
  return currency === "USD"
    ? `$${Math.round(amount).toLocaleString("en-US")}`
    : `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="1"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Checkout script failed to load")));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Checkout script failed to load"));
    document.body.appendChild(script);
  });
}

export default function CheckoutPay({
  payment,
  config,
  siteName,
  upiAvailable,
  country,
}: {
  payment: CheckoutPayment;
  config: CheckoutConfig;
  siteName: string;
  /** false when the visitor is outside India and UPI is India-only */
  upiAvailable: boolean;
  country: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "opening" | "verifying">("idle");
  const [error, setError] = useState("");

  async function pay() {
    setError("");
    setStatus("opening");
    try {
      await loadCheckoutScript();
      const response = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const order = (await response.json()) as {
        ok?: boolean;
        error?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        name?: string;
        description?: string;
      };
      if (!response.ok || !order.ok || !order.orderId || !order.keyId) {
        setStatus("idle");
        setError(order.error ?? "Could not start the payment. Please try again.");
        return;
      }
      if (!window.Razorpay) {
        setStatus("idle");
        setError("The payment window could not load. Check your connection and try again.");
        return;
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name ?? siteName,
        description: order.description ?? payment.description,
        order_id: order.orderId,
        prefill: { name: payment.customerName, email: payment.customerEmail },
        notes: { reference: payment.reference, paymentId: payment.id },
        // UPI is hidden for visitors outside India when the admin keeps it India-only.
        config: {
          display: upiAvailable
            ? { preferences: { show_default_blocks: true } }
            : { hide: [{ method: "upi" }], preferences: { show_default_blocks: true } },
        },
        theme: { color: "#4f46e5" },
        modal: {
          ondismiss: () => {
            setStatus("idle");
            setError("Payment window closed. Nothing was charged — you can try again.");
          },
        },
        handler: async (response: {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) => {
          setStatus("verifying");
          try {
            const verify = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                paymentId: payment.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const result = (await verify.json()) as { ok?: boolean; error?: string };
            if (verify.ok && result.ok) {
              router.push(`/payment/success?id=${encodeURIComponent(payment.id)}`);
              return;
            }
            router.push(
              `/payment/failed?id=${encodeURIComponent(payment.id)}&reason=${encodeURIComponent(result.error ?? "verification")}`,
            );
          } catch {
            router.push(`/payment/failed?id=${encodeURIComponent(payment.id)}&reason=network`);
          }
        },
      });
      checkout.on("payment.failed", (args: unknown) => {
        const detail = args as { error?: { description?: string } } | undefined;
        setStatus("idle");
        setError(detail?.error?.description ?? "The payment did not go through. You can try again.");
      });
      checkout.open();
    } catch {
      setStatus("idle");
      setError("Could not open the payment window. Check your connection and try again.");
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-relaxed text-rose-700">
          {error}
        </p>
      ) : null}

      {config.online ? (
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-ink">Pay online</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Secure Razorpay checkout. Your card details never touch our server.
              </p>
            </div>
            <span className="chip bg-emerald-50 text-emerald-700">Instant confirmation</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className={`chip ${upiAvailable ? "bg-brand-soft text-brand" : "bg-slate-100 text-slate-400 line-through"}`}>
              UPI {upiAvailable ? "" : "· India only"}
            </span>
            <span className="chip bg-slate-100 text-slate-600">Credit / debit card</span>
            <span className="chip bg-slate-100 text-slate-600">Netbanking</span>
          </div>

          {!upiAvailable ? (
            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
              UPI is shown to Indian accounts only{country ? ` (we detected ${country})` : ""}. Cards and netbanking work
              from anywhere.
            </p>
          ) : null}

          <button
            type="button"
            onClick={pay}
            disabled={status !== "idle"}
            className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
          >
            {status === "opening"
              ? "Opening secure checkout…"
              : status === "verifying"
                ? "Verifying payment…"
                : `Pay ${money(payment.amount, payment.currency)}`}
          </button>
          <p className="mt-2 text-center text-[10.5px] text-muted">
            You will receive a payment slip on {payment.customerEmail} as soon as the payment is confirmed.
          </p>
        </div>
      ) : null}

      {config.manual ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm font-bold text-amber-900">Or pay by manual transfer</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
            {config.manualNote || "Pay by UPI or bank transfer and send us the reference — we confirm it by hand."}
          </p>
          <dl className="mt-3 space-y-1.5 text-[12px] text-amber-900">
            {config.manualUpiId ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold">UPI ID:</dt>
                <dd className="select-all font-mono">{config.manualUpiId}</dd>
                {config.manualUpiName ? <dd className="text-amber-700">({config.manualUpiName})</dd> : null}
              </div>
            ) : null}
            {config.manualBank ? (
              <div>
                <dt className="font-semibold">Bank details:</dt>
                <dd className="mt-0.5 whitespace-pre-line font-mono text-[11.5px] leading-relaxed">{config.manualBank}</dd>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold">Reference:</dt>
              <dd className="font-mono">{payment.reference}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
            Mention <strong>{payment.reference}</strong> in the transfer note and reply to the request confirmation. Your
            placement goes live once the admin confirms the money; the payment slip is emailed after that.
          </p>
        </div>
      ) : null}
    </div>
  );
}
