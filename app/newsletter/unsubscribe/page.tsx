import Link from "next/link";
import type { Metadata } from "next";
import { unsubscribeNewsletterAction } from "@/app/actions";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe from the newsletter",
  robots: { index: false, follow: false },
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string; error?: string }>;
}) {
  const { token = "", done, error } = await searchParams;
  const db = await refreshDb();
  const row = (db.subscribers ?? []).find((item) => item.token === token);

  return (
    <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
      <div className="card p-6 text-center">
        {done ? (
          <>
            <p className="text-3xl" aria-hidden>
              👋
            </p>
            <h1 className="display mt-2 text-2xl text-ink">You are unsubscribed</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {row?.email ?? "This address"} will not receive the weekly email again. The site and rankings stay free and
              open.
            </p>
            <Link href="/" className="btn btn-ghost mt-4 text-xs">
              Back to home
            </Link>
          </>
        ) : error === "missing" || !row ? (
          <>
            <p className="text-3xl" aria-hidden>
              🔗
            </p>
            <h1 className="display mt-2 text-2xl text-ink">Link not recognised</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This unsubscribe link is invalid. Use the link from the latest email, or reply to any email and we will
              remove you.
            </p>
            <Link href="/" className="btn btn-ghost mt-4 text-xs">
              Back to home
            </Link>
          </>
        ) : (
          <>
            <p className="text-3xl" aria-hidden>
              ✉️
            </p>
            <h1 className="display mt-2 text-2xl text-ink">Unsubscribe?</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <strong>{row.email}</strong> will stop receiving the weekly Top 5 AI email.
            </p>
            <form action={unsubscribeNewsletterAction} className="mt-4">
              <input type="hidden" name="token" value={token} />
              <button className="btn btn-primary text-xs">Unsubscribe</button>
            </form>
            <Link href="/" className="mt-3 inline-block text-[11px] font-semibold text-brand hover:underline">
              Keep my subscription
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
