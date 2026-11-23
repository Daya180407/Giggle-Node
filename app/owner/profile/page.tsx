import { redirect } from "next/navigation";
import { saveOwnerProfileAction } from "@/app/owner-actions";
import OwnerAvatarForm from "@/components/owner/OwnerAvatarForm";
import { getCurrentOwner } from "@/lib/owner-auth";
import { avatarSrc, aiIdsForOwner, verifiedOwnerFor } from "@/lib/owners";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  profile: "Profile updated.",
  password: "Password changed. Other sessions were signed out.",
  avatar: "Profile picture updated.",
};

const ERRORS: Record<string, string> = {
  name: "Display name must be at least 2 characters.",
  short: "New password must be at least 8 characters.",
  match: "The two new password fields do not match.",
  current: "Your current password is incorrect.",
  image: "That picture could not be saved. Use a JPG, PNG or WebP under 400KB.",
  storage: "The picture could not be stored right now. Please try again.",
};

export default async function OwnerProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/owner/login");

  const { saved, error } = await searchParams;
  const db = await refreshDb();
  const aiIds = aiIdsForOwner(db, owner.id);
  const allVerified = aiIds.length > 0 && aiIds.every((id) => verifiedOwnerFor(db, id)?.id === owner.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="display text-xl text-ink">Owner profile</h2>
          {allVerified ? <span className="chip bg-emerald-50 text-emerald-700">✓ Verified owner</span> : null}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Your username and company email are managed by the site team. You can change your picture, display name and
          password here.
        </p>
        {saved && NOTICES[saved] ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
            {NOTICES[saved]}
          </p>
        ) : null}
        {error && ERRORS[error] ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {ERRORS[error]}
          </p>
        ) : null}

        <div className="mt-4 border-t border-line pt-4">
          <OwnerAvatarForm src={avatarSrc(owner)} initials={owner.initials} />
        </div>

        <form action={saveOwnerProfileAction} className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="block text-xs font-semibold text-slate-600">
            Display name
            <input name="displayName" required defaultValue={owner.displayName} maxLength={60} className="field mt-1 w-full" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Username
              <input readOnly value={owner.username} className="field mt-1 w-full bg-slate-50 text-slate-500" />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Company email
              <input readOnly value={owner.email} className="field mt-1 w-full bg-slate-50 text-slate-500" />
            </label>
          </div>

          <div className="rounded-xl border border-line/70 bg-slate-50/60 p-3">
            <p className="text-xs font-bold text-ink">Change password</p>
            <p className="text-[10.5px] text-muted">Leave these empty to keep the current password.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label className="block text-[11px] font-semibold text-slate-600">
                Current
                <input name="currentPassword" type="password" autoComplete="current-password" className="field mt-1 w-full" />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                New (8+)
                <input name="newPassword" type="password" autoComplete="new-password" className="field mt-1 w-full" />
              </label>
              <label className="block text-[11px] font-semibold text-slate-600">
                Confirm
                <input name="confirmPassword" type="password" autoComplete="new-password" className="field mt-1 w-full" />
              </label>
            </div>
          </div>

          <button className="btn btn-primary">Save profile</button>
        </form>
      </section>

      <section className="card p-5 text-[11px] leading-relaxed text-muted">
        <p className="text-xs font-bold text-ink">Account</p>
        <p className="mt-1">
          Verified on {owner.verifiedAt ? new Date(owner.verifiedAt).toLocaleDateString("en-IN") : "—"} from{" "}
          {owner.verifiedFrom ?? "—"} · last sign in{" "}
          {owner.lastLoginAt ? new Date(owner.lastLoginAt).toLocaleString("en-IN") : "never"}.
        </p>
        <p className="mt-1">
          Editing mode: {owner.tier === "live" ? "changes go live immediately" : "changes wait for admin approval"}. The
          site team can switch this at any time.
        </p>
      </section>
    </div>
  );
}
