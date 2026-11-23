import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ownerLogoutAction } from "@/app/owner-actions";
import { getCurrentOwner } from "@/lib/owner-auth";
import { avatarSrc } from "@/lib/owners";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Owner dashboard",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/owner", label: "Dashboard" },
  { href: "/owner/posts", label: "Posts" },
  { href: "/owner/profile", label: "Profile" },
];

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const owner = await getCurrentOwner();
  const src = owner ? avatarSrc(owner) : "";

  return (
    <div className="mx-auto max-w-[1100px] px-3 py-6 sm:px-6">
      {owner ? (
        <header className="card mb-5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-12 w-12 rounded-2xl border border-line object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-sm font-extrabold text-brand">
                {owner.initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                {owner.displayName}
                <span className="chip bg-emerald-50 text-emerald-700">✓ Verified owner</span>
                <span
                  className={`chip ${
                    owner.tier === "review" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {owner.tier === "review" ? "Edits need approval" : "Live editing"}
                </span>
              </p>
              <p className="text-[11px] text-muted">
                @{owner.username} · {owner.email}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="btn btn-ghost !py-1.5 text-xs">
                  {link.label}
                </Link>
              ))}
              <form action={ownerLogoutAction}>
                <button className="btn btn-ghost !py-1.5 text-xs text-rose-600">Log out</button>
              </form>
            </div>
          </div>
        </header>
      ) : null}

      {owner?.mustChangePassword ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Your password was created by the site team.{" "}
          <Link href="/owner/profile" className="underline">
            Set your own password
          </Link>{" "}
          before you continue editing.
        </div>
      ) : null}

      {children}
    </div>
  );
}
