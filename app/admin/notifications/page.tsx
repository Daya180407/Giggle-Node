import Link from "next/link";
import {
  broadcastNotificationAction,
  deleteEmailAction,
  deleteNotificationAction,
  deliverOutboxAction,
  queueNewsletterAction,
  queueTestEmailAction,
  saveEmailSettingsAction,
} from "@/app/actions";
import { mailerConfigured } from "@/lib/mailer";
import { requireAreaPage } from "@/lib/permissions";
import { getSiteSettings } from "@/lib/settings";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_TONE: Record<string, string> = {
  queued: "bg-amber-50 text-amber-700",
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-600",
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; queued?: string; sent?: string }>;
}) {
  await requireAreaPage("notifications");
  const { saved, error, queued, sent } = await searchParams;
  const db = readDb();
  const settings = getSiteSettings(db);
  const email = settings.email;
  const notifications = db.notifications ?? [];
  const outbox = db.emailOutbox ?? [];
  const queuedCount = outbox.filter((message) => message.status === "queued").length;
  const sentCount = outbox.filter((message) => message.status === "sent").length;
  const hasMailer = mailerConfigured();
  const lastNewsletter = email.lastNewsletterAt ? new Date(email.lastNewsletterAt) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Growth</p>
          <h2 className="display mt-1 text-2xl text-ink">Notifications & email</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            In-app notifications go out automatically for new AI and published posts. Email is queued into an outbox —
            delivery needs <code>RESEND_API_KEY</code> in the environment.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${hasMailer ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {hasMailer ? "Email provider connected" : "Email provider not configured"}
          </span>
          <span className="chip bg-slate-100 text-slate-600">{queuedCount} queued</span>
          <span className="chip bg-slate-100 text-slate-600">{sentCount} sent</span>
        </div>
      </div>

      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {saved === "broadcast"
            ? "Notification sent to the selected audience."
            : saved === "newsletter"
              ? `Top 5 AI email queued for ${queued ?? "all"} recipients.`
              : saved === "test"
                ? "Test email queued. Deliver the outbox to send it."
                : saved === "delivered"
                  ? `${sent ?? "0"} email(s) delivered. Check the outbox for failures.`
                  : saved === "queued-only"
                    ? "Messages are queued. Set RESEND_API_KEY (and optional EMAIL_FROM) to deliver them."
                    : saved === "empty"
                      ? "Nothing queued right now."
                      : "Saved."}
        </div>
      ) : null}
      {error === "title" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          Add a notification title.
        </div>
      ) : null}
      {error === "email" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          That email address is not valid.
        </div>
      ) : null}
      {error === "no-ai" ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          The catalogue is empty, so there is no Top 5 to send.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action={saveEmailSettingsAction} className="space-y-4">
          <section className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold">Push notifications</h3>
                <p className="text-xs text-muted">Bell icon inbox on /notifications for signed-in users.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="notificationsAuto"
                  defaultChecked={settings.notificationsAuto}
                  className="h-4 w-4 accent-indigo-600"
                />
                Auto-send on new AI / post
              </label>
            </div>
            <div className="mt-3 rounded-xl border border-line bg-slate-50/60 p-3 text-[11px] leading-relaxed text-slate-600">
              Broadcast manual announcements from the panel on the right. Every user sees these in the bell menu; staff
              can also receive staff-only notices.
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold">Email on / off</h3>
                <p className="text-xs text-muted">Choose which emails are queued.</p>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  name="emailEnabled"
                  defaultChecked={email.enabled}
                  className="h-4 w-4 accent-indigo-600"
                />
                Email enabled
              </label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-2.5 text-xs">
                <input type="checkbox" name="welcome" defaultChecked={email.welcome} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                <span>
                  <span className="block font-semibold">Welcome email</span>
                  <span className="text-[11px] text-muted">Sent after signup.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-2.5 text-xs">
                <input type="checkbox" name="ratingThanks" defaultChecked={email.ratingThanks} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                <span>
                  <span className="block font-semibold">Rating thank-you</span>
                  <span className="text-[11px] text-muted">After a rating is saved.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-xl border border-line bg-slate-50/60 p-2.5 text-xs">
                <input type="checkbox" name="newsletter" defaultChecked={email.newsletter} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                <span>
                  <span className="block font-semibold">Weekly Top 5</span>
                  <span className="text-[11px] text-muted">Manual queue / scheduled day.</span>
                </span>
              </label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                name="changelogEnabled"
                defaultChecked={settings.changelogEnabled}
                className="h-4 w-4 accent-indigo-600"
              />
              Show the public changelog page
            </label>
          </section>

          <section className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold">Email templates</h3>
            <p className="text-xs text-muted">Placeholders: {"{{name}}"}, {"{{site}}"}, {"{{ai}}"}, {"{{top5}}"}.</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Welcome email</p>
                <input
                  name="welcomeSubject"
                  defaultValue={email.templates.welcome.subject}
                  className="field mt-1 !py-2 text-xs"
                  maxLength={140}
                  aria-label="Welcome email subject"
                />
                <textarea
                  name="welcomeBody"
                  defaultValue={email.templates.welcome.body}
                  rows={3}
                  className="field mt-1.5 text-xs"
                  maxLength={4000}
                  aria-label="Welcome email body"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Rating thank-you</p>
                <input
                  name="ratingSubject"
                  defaultValue={email.templates.ratingThanks.subject}
                  className="field mt-1 !py-2 text-xs"
                  maxLength={140}
                  aria-label="Rating thank-you subject"
                />
                <textarea
                  name="ratingBody"
                  defaultValue={email.templates.ratingThanks.body}
                  rows={3}
                  className="field mt-1.5 text-xs"
                  maxLength={4000}
                  aria-label="Rating thank-you body"
                />
              </div>
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold">Weekly Top 5 AI newsletter</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
              <div>
                <label className="label" htmlFor="newsletterSubject">
                  Subject
                </label>
                <input
                  id="newsletterSubject"
                  name="newsletterSubject"
                  defaultValue={email.newsletterSubject}
                  className="field !py-2 text-xs"
                  maxLength={140}
                />
              </div>
              <div>
                <label className="label" htmlFor="newsletterDay">
                  Scheduled day
                </label>
                <select id="newsletterDay" name="newsletterDay" defaultValue={email.newsletterDay} className="field !py-2 text-xs">
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label className="label" htmlFor="newsletterBody">
                Body ({"{{top5}}"} becomes the live top five)
              </label>
              <textarea
                id="newsletterBody"
                name="newsletterBody"
                defaultValue={email.newsletterBody}
                rows={4}
                className="field text-xs"
                maxLength={4000}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Last queued: {lastNewsletter ? lastNewsletter.toLocaleString("en-IN") : "never"}.
            </p>
          </section>

          <div className="flex justify-end">
            <button className="btn btn-primary">Save notification & email settings</button>
          </div>
        </form>

        <div className="space-y-4">
          <section className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold">Send a notification now</h3>
            <form action={broadcastNotificationAction} className="mt-3 space-y-2">
              <input name="title" required maxLength={120} placeholder="Title, e.g. New AI added: Sora" className="field !py-2 text-xs" />
              <textarea name="body" rows={2} maxLength={300} placeholder="Short message shown in the bell menu" className="field text-xs" />
              <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                <input name="href" placeholder="/ai/sora" className="field !py-2 text-xs" />
                <select name="audience" defaultValue="all" className="field !py-2 text-xs" aria-label="Audience">
                  <option value="all">All users</option>
                  <option value="staff">Staff only</option>
                </select>
              </div>
              <button className="btn btn-dark w-full !py-2 text-xs">Send notification</button>
            </form>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold">Newsletter & delivery</h3>
                <p className="text-xs text-muted">{db.users.filter((user) => !user.banned).length} recipients available.</p>
              </div>
              <span className="chip bg-slate-100 text-slate-600">{email.newsletter ? "On" : "Off"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={queueNewsletterAction}>
                <button className="btn btn-primary !py-2 text-xs">Queue Top 5 AI email</button>
              </form>
              <form action={deliverOutboxAction}>
                <button className="btn btn-ghost !py-2 text-xs">Deliver queued emails</button>
              </form>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              {hasMailer
                ? "Delivery uses Resend with RESEND_API_KEY. EMAIL_FROM controls the sender."
                : "Set RESEND_API_KEY in the project environment to turn queued messages into real email. Nothing is marked sent until the provider accepts it."}
            </p>
            <form action={queueTestEmailAction} className="mt-3 flex flex-wrap gap-2">
              <input
                name="to"
                type="email"
                placeholder="Test recipient email"
                className="field min-w-0 flex-1 !py-2 text-xs"
                aria-label="Test recipient"
              />
              <button className="btn btn-ghost !py-2 text-xs">Queue test</button>
            </form>
            <p className="mt-2 text-[11px] text-muted">
              The weekly send needs a scheduled trigger (cron). Without one, use the queue button on your chosen day.
            </p>
          </section>

          <section className="card p-4 sm:p-5">
            <h3 className="text-sm font-bold">Recent notifications</h3>
            <div className="mt-2 divide-y divide-line">
              {notifications.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-start gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{row.title}</p>
                    <p className="truncate text-[11px] text-muted">
                      {row.audience === "staff" ? "Staff" : "Everyone"} ·{" "}
                      {new Date(row.createdAt).toLocaleString("en-IN")} · {(row.readBy ?? []).length} read
                    </p>
                  </div>
                  <form action={deleteNotificationAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
                  </form>
                </div>
              ))}
              {notifications.length === 0 ? (
                <p className="py-4 text-xs text-muted">No notifications yet.</p>
              ) : null}
            </div>
            <Link href="/notifications" className="mt-2 inline-block text-[11px] font-semibold text-brand">
              Open public inbox →
            </Link>
          </section>
        </div>
      </div>

      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Email outbox</h3>
          <span className="text-[11px] text-muted">Newest 20 · queued/sent/failed is real delivery state</span>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Recipient</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {outbox.slice(0, 20).map((message) => (
                <tr key={message.id}>
                  <td className="max-w-[180px] truncate py-2 pr-3">{message.to}</td>
                  <td className="max-w-[240px] truncate py-2 pr-3">{message.subject}</td>
                  <td className="py-2 pr-3 text-muted">{message.kind}</td>
                  <td className="py-2 pr-3">
                    <span className={`chip ${STATUS_TONE[message.status]}`}>{message.status}</span>
                    {message.error ? <span className="ml-1 text-[10px] text-rose-600">{message.error.slice(0, 40)}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-muted">{new Date(message.createdAt).toLocaleString("en-IN")}</td>
                  <td className="py-2 text-right">
                    <form action={deleteEmailAction}>
                      <input type="hidden" name="id" value={message.id} />
                      <button className="text-[11px] font-semibold text-rose-600 hover:underline">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {outbox.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted">
                    Outbox is empty.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
