import "server-only";
import { headers } from "next/headers";
import { getCategories } from "./categories";
import { deliverEmails, mailerConfigured } from "./mailer";
import { pushNotification, queueEmail } from "./notify";
import { countryFromHeaders, formatPaymentMoney, paymentSlipBody } from "./payments";
import { getSiteSettings } from "./settings";
import { flushPendingWrites, mutateDb, readDb } from "./store";
import { money, placementListLabel, slotMeta } from "./sponsors";
import type { DB, Payment, SponsorRequest } from "./types";

/**
 * Server-side payment lifecycle: a Razorpay order (or a manual transfer) becomes
 * a paid booking, an in-app staff notification and a payment-slip email.
 * The gateway callback only *asks* this module to complete a payment; the
 * signature and the gateway's own payment record are verified before it runs.
 */

export const BOOKING_DAYS = 30;

/** Advertiser country from the hosting platform's geo headers. */
export async function requestCountry(): Promise<string> {
  const headerList = await headers();
  return countryFromHeaders(headerList);
}

/** Booking description shared by checkout, the slip and the admin ledger. */
export function sponsorPaymentDescription(
  db: DB,
  request: Pick<SponsorRequest, "company" | "targetName" | "slot" | "listKey" | "targetType">,
): string {
  const names = new Map(getCategories(db).map((category) => [category.slug, category.name]));
  const listLabel = placementListLabel(request, (slug) => names.get(slug) ?? slug);
  return `${request.company} — ${request.targetName} · ${slotMeta(request.slot)?.short ?? request.slot} in ${listLabel} · ${BOOKING_DAYS} days`;
}

/**
 * Creates (or refreshes) the payable order behind a sponsorship request.
 * A paid order is never reopened.
 */
export function openPaymentForRequest(
  db: DB,
  request: SponsorRequest,
  input: { id: string; site: string; country?: string; provider: "razorpay" | "manual" },
): Payment | null {
  if (!Array.isArray(db.payments)) db.payments = [];
  const existing = db.payments.find(
    (payment) => payment.sponsorRequestId === request.id && payment.status !== "paid",
  );
  if (existing) {
    existing.amount = request.price;
    // A request taken while Razorpay was off is a manual order; if the admin turns
    // the gateway on before it is paid, the same reference can be paid online.
    existing.provider = input.provider;
    existing.updatedAt = new Date().toISOString();
    existing.description = sponsorPaymentDescription(db, request);
    return existing;
  }
  if (db.payments.some((payment) => payment.sponsorRequestId === request.id && payment.status === "paid")) {
    return null;
  }
  db.paymentSequence = Math.max(0, Math.floor(Number(db.paymentSequence) || 0)) + 1;
  const now = new Date().toISOString();
  const row: Payment = {
    id: input.id,
    reference: `GN-${String(db.paymentSequence).padStart(6, "0")}`,
    provider: input.provider,
    purpose: "sponsor",
    sponsorRequestId: request.id,
    description: sponsorPaymentDescription(db, request),
    amount: request.price,
    currency: getSiteSettings(db).payments.currency,
    customerName: request.contactName,
    customerEmail: request.email,
    customerCountry: input.country ?? "",
    method: null,
    status: "created",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    verifiedAt: null,
    failureReason: null,
    slipEmailedAt: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
  };
  db.payments.unshift(row);
  return row;
}

/** Books the placement the payment paid for, keeping any existing booking in place. */
function bookPlacementForPayment(db: DB, request: SponsorRequest, payment: Payment): void {
  if (!Array.isArray(db.sponsorPlacements)) db.sponsorPlacements = [];
  const until = new Date(Date.now() + BOOKING_DAYS * 86400000).toISOString().slice(0, 10);
  const note = `Paid online · ${payment.reference} · ${request.company}`;
  const existing = db.sponsorPlacements.find(
    (placement) =>
      placement.targetType === request.targetType &&
      placement.targetId === request.targetId &&
      placement.listKey === request.listKey &&
      placement.slot === request.slot,
  );
  if (existing) {
    existing.until = until;
    existing.active = true;
    existing.amount = payment.amount;
    existing.note = note;
    return;
  }
  db.sponsorPlacements.unshift({
    id: `sp_${payment.id.slice(-10)}`,
    targetType: request.targetType,
    targetId: request.targetId,
    targetName: request.targetName,
    targetSlug: request.targetSlug,
    listKey: request.listKey,
    slot: request.slot,
    amount: payment.amount,
    until,
    active: true,
    note,
    views: 0,
    clicks: 0,
    createdAt: new Date().toISOString(),
  });
}

export type CompletePaymentResult = {
  ok: boolean;
  error?: string;
  payment?: Payment;
  alreadyPaid?: boolean;
  slipQueued?: boolean;
  slipDelivered?: boolean;
};

/**
 * Marks an order paid. Idempotent: a second callback for the same order returns
 * the existing paid record and sends no second slip.
 */
export async function completePayment(
  paymentId: string,
  options: { method?: "upi" | "card" | "manual"; gatewayPaymentId?: string | null } = {},
): Promise<CompletePaymentResult> {
  const current = (readDb().payments ?? []).find((payment) => payment.id === paymentId);
  if (!current) return { ok: false, error: "That payment order no longer exists." };
  if (current.status === "paid") return { ok: true, payment: current, alreadyPaid: true };

  let mailId: string | null = null;
  let method: "upi" | "card" | "manual" = options.method ?? (current.provider === "manual" ? "manual" : "card");

  const found = mutateDb((db) => {
    if (!Array.isArray(db.payments)) return false;
    const payment = db.payments.find((row) => row.id === paymentId);
    if (!payment) return false;
    // A parallel webhook may have completed it while we were verifying.
    if (payment.status === "paid") return true;
    const now = new Date().toISOString();
    const settings = getSiteSettings(db);
    payment.status = "paid";
    payment.paidAt = now;
    payment.verifiedAt = now;
    payment.updatedAt = now;
    payment.failureReason = null;
    payment.method = method;
    if (options.gatewayPaymentId) payment.razorpayPaymentId = options.gatewayPaymentId;

    const request = (db.sponsorRequests ?? []).find((row) => row.id === payment.sponsorRequestId);
    if (request) {
      request.paymentStatus = "paid";
      request.paymentId = payment.id;
      request.paidAt = now;
      if (settings.payments.autoBookPaid) bookPlacementForPayment(db, request, payment);
    }

    pushNotification(db, {
      title: `Payment received: ${money(payment.amount, payment.currency)}`,
      body: `${payment.customerName} paid for ${payment.description}. Reference ${payment.reference}.`,
      href: "/admin/payments",
      kind: "system",
      audience: "staff",
    });

    const site = settings.siteName || "GiggleNode";
    const queued = queueEmail(
      db,
      settings.email,
      {
        to: payment.customerEmail,
        kind: "payment-slip",
        subject: `Payment slip ${payment.reference} — ${site}`,
        body: paymentSlipBody({
          site,
          reference: payment.reference,
          date: new Date(payment.paidAt ?? now).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          customerName: payment.customerName,
          customerEmail: payment.customerEmail,
          description: payment.description,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          method,
          gatewayPaymentId: payment.razorpayPaymentId,
          supportEmail: settings.supportEmail,
        }),
        force: true,
      },
    );
    mailId = queued.id;
    return true;
  });

  if (!found) return { ok: false, error: "That payment order no longer exists." };

  await flushPendingWrites();

  let slipDelivered = false;
  if (mailId && mailerConfigured()) {
    const queued = (readDb().emailOutbox ?? []).find((message) => message.id === mailId && message.status === "queued");
    if (queued) {
      const [result] = await deliverEmails([queued]);
      slipDelivered = Boolean(result?.ok);
      mutateDb((db) => {
        const row = db.emailOutbox?.find((message) => message.id === mailId);
        if (!row) return;
        if (result?.ok) {
          row.status = "sent";
          row.sentAt = new Date().toISOString();
        } else {
          row.status = "failed";
          row.error = (result?.error ?? "Delivery failed").slice(0, 220);
        }
      });
      await flushPendingWrites();
      if (slipDelivered) {
        mutateDb((db) => {
          const payment = db.payments?.find((row) => row.id === paymentId);
          if (payment) payment.slipEmailedAt = new Date().toISOString();
        });
      }
    }
  }

  return {
    ok: true,
    payment: (readDb().payments ?? []).find((payment) => payment.id === paymentId),
    slipQueued: Boolean(mailId),
    slipDelivered,
  };
}

/** Records a failed attempt without ever marking the order paid. */
export function failPayment(paymentId: string, reason: string): void {
  mutateDb((db) => {
    const payment = (db.payments ?? []).find((row) => row.id === paymentId);
    if (!payment || payment.status === "paid") return;
    payment.status = "failed";
    payment.failureReason = reason.slice(0, 240);
    payment.updatedAt = new Date().toISOString();
  });
}

/** Human-readable amount used in the admin ledger and pages. */
export function paymentMoney(payment: Pick<Payment, "amount" | "currency">): string {
  return formatPaymentMoney(payment.amount, payment.currency);
}
