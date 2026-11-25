import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/auth-actions";
import AdminNav from "@/components/admin/AdminNav";
import BackButton from "@/components/admin/BackButton";
import BrandLogo from "@/components/BrandLogo";
import { requireStaffPage, roleLabel } from "@/lib/permissions";
import { resolveRoles, roleAreas } from "@/lib/roles";
import { readDb } from "@/lib/store";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireStaffPage();
  const roles = resolveRoles(readDb().roles);

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6">
      <header className="relative overflow-hidden rounded-3xl bg-[#07070d] p-4 text-white sm:p-6">
        <div className="hero-blobs absolute inset-0" aria-hidden>
          <span className="hero-blob-1 !left-[-10%] !top-[-90%] !h-72 !w-72 !opacity-40" />
          <span className="hero-blob-2 !right-[-6%] !top-[-80%] !h-64 !w-64 !opacity-30" />
        </div>
        <div className="hero-grid absolute inset-0 opacity-40" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size={46} className="shadow-xl shadow-violet-950/60" />
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">Admin workspace</p>
              <h1 className="display text-2xl leading-tight sm:text-[28px]">Control center</h1>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {user.name} · {roleLabel(user.role, roles)} · every change is logged
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
              <span className="live-dot" aria-hidden /> Live data
            </span>
            <BackButton label="Back" />
            <Link
              href="/"
              className="btn border border-white/15 bg-white/[0.06] !py-2 text-xs text-white hover:bg-white/10"
            >
              View site ↗
            </Link>
            <form action={logoutAction}>
              <button className="btn border border-white/10 bg-transparent !py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-[228px_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:hidden">
            All admin sections · swipe →
          </p>
          <AdminNav areas={roleAreas(user.role, roles)} isAdmin={user.role === "admin"} roleName={roleLabel(user.role, roles)} />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
