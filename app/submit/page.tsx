import Link from "next/link";
import type { Metadata } from "next";
import { SubmitToolForm } from "@/components/CommunityForms";
import { SubmitAppForm } from "@/components/ContributePanel";
import { getCurrentUser } from "@/lib/auth";
import { getCategories } from "@/lib/categories";
import { DESKTOP_GROUPS, MOBILE_GROUPS } from "@/lib/software";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit an AI tool — GigleNode",
  description:
    "Suggest an AI tool for the GigleNode directory. Every submission is reviewed by an editor and ranked by real user ratings, never by payment.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
  const [db, user] = await Promise.all([readDb(), getCurrentUser()]);
  const categories = getCategories(db).map((category) => ({
    slug: category.slug,
    name: category.name,
    emoji: category.emoji,
  }));
  const groups = [
    ...MOBILE_GROUPS.map((group) => ({ key: group.key, label: group.label, kind: "mobile" as const })),
    ...DESKTOP_GROUPS.map((group) => ({ key: group.key, label: group.label, kind: "desktop" as const })),
  ];
  const pending = (db.toolSubmissions ?? []).filter((row) => row.status === "pending").length;
  const approved = (db.toolSubmissions ?? []).filter((row) => row.status === "approved").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <span className="chip chip-brand mx-auto">✦ Community</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Suggest an AI tool</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Found a tool, a mobile app or PC software that belongs in the directory? Send it in. An editor checks the
          official site and pricing before it goes live — that is what keeps these rankings honest.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">
          <span className="chip bg-slate-100 text-slate-600">{pending} in review</span>
          <span className="chip bg-emerald-50 text-emerald-700">{approved} published from suggestions</span>
        </div>
      </div>

      <div className="mt-6">
        <SubmitToolForm categories={categories} defaultEmail={user?.email ?? ""} />
      </div>

      <div className="mt-8">
        <div className="mb-2">
          <h2 className="display text-lg text-ink">Add a mobile app or PC software</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Signed-in users can list apps and desktop software. Approved entries appear in the Home apps showcase.
          </p>
        </div>
        <SubmitAppForm categories={categories} groups={groups} signedIn={Boolean(user)} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: "Checked by editors", body: "We open the site, verify the pricing and write the summary ourselves." },
          { title: "Rated by users", body: "Once live, anyone signed in can rate each model separately." },
          { title: "No paid placement", body: "A suggestion never buys a position. Sponsored rows are always labelled." },
        ].map((item) => (
          <div key={item.title} className="card p-4">
            <h2 className="display text-sm text-ink">{item.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Own one of the tools already listed?{" "}
        <Link href="/category/all" className="font-semibold text-brand hover:underline">
          Open its page
        </Link>{" "}
        and use “Claim this listing”.
      </p>
    </div>
  );
}
