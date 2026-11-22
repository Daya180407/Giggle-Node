import Link from "next/link";
import type { Metadata } from "next";
import { confirmNewsletterAction } from "@/app/actions";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your newsletter subscription",
  robots: { index: false, follow: false },
};

export default async function NewsletterConfirmPage({
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
        {done && row?.confirmed ? (
          <>
            <p className="text-3xl" aria-hidden>
              ✅
            </p>
            <h1 className="display mt-2 text-2xl text-ink">Subscription confirmed</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {row.email} will get the weekly Top 5 AI email. Every issue links to the live ranking, and you can
              unsubscribe from any email.
            </p>
            <Link href="/category/all" className="btn btn-primary mt-4 text-xs">
              Explore the ranking
            </Link>
          </>
        ) : error === "missing" || !row ? (
          <>
            <p className="text-3xl" aria-hidden>
              🔗
            </p>
            <h1 className="display mt-2 text-2xl text-ink">Link not recognised</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This confirmation link is invalid or has already been replaced. Subscribe again from the footer and use the
              newest link.
            </p>
            <Link href="/" className="btn btn-ghost mt-4 text-xs">
              Back to home
            </Link>
          </>
        ) : (
          <>
            <p className="text-3xl" aria-hidden>
              📬
            </p>
            <h1 className="display mt-2 text-2xl text-ink">Confirm your subscription</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              One click and <strong>{row.email}</strong> joins the weekly Top 5 AI email. No spam, unsubscribe anytime.
            </p>
            <form action={confirmNewsletterAction} className="mt-4">
              <input type="hidden" name="token" value={token} />
              <button className="btn btn-primary text-xs">Confirm subscription</button>
            </form>
          </>
        )}
      </div>
      <p className="mt-4 text-center text-[11px] text-muted">
        Changed your mind?{" "}
        <Link href={`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`} className="font-semibold text-brand hover:underline">
          Unsubscribe
        </Link>
      </p>
    </div>
  );
}
