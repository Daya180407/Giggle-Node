import Link from "next/link";
import { redirect } from "next/navigation";
import AiLogo from "@/components/AiLogo";
import { avatarSrc, ownerChangesFor, aiIdsForOwner, ownerDrafts } from "@/lib/owners";
import { getCurrentOwner } from "@/lib/owner-auth";
import { refreshDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const owner = await getCurrentOwner();
  if (!owner) redirect("/owner/login");

  const db = await refreshDb();
  const aiIds = aiIdsForOwner(db, owner.id);
  const ais = db.ai.filter((ai) => aiIds.includes(ai.id));
  const pending = ownerChangesFor(db, owner.id, "pending");
  const applied = ownerChangesFor(db, owner.id, "applied");
  const src = avatarSrc(owner);

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <p className="eyebrow">Owner dashboard</p>
        <h2 className="display mt-1 text-2xl text-ink">Welcome back, {owner.displayName}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          You can edit the plans, starting price, models and draft posts of the listings below. Site-level fields
          (featured, sponsored, hidden, affiliate links), deleting models or plans, reviews and ratings stay with the
          GiggleNode team. Every edit you save is recorded with a before/after snapshot.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className={`chip ${pending.length ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
            {pending.length} waiting for approval
          </span>
          <span className="chip bg-emerald-50 text-emerald-700">{applied.length} applied edits</span>
          <span className="chip bg-slate-100 text-slate-600">{ownerDrafts(db, owner.id).length} open drafts</span>
          <span className="chip bg-slate-100 text-slate-600">{ais.length} listing(s)</span>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-bold">Your listings</h3>
        {ais.length === 0 ? (
          <p className="card p-4 text-xs text-muted">
            No listing is linked to this login yet. Ask the site team to grant it from the admin panel.
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {ais.map((ai) => {
            const plans = ai.plans?.length ?? 0;
            const models = db.models.filter((model) => model.aiId === ai.id).length;
            return (
              <article key={ai.id} className="card p-4">
                <div className="flex items-center gap-2">
                  <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={36} rounded="rounded-xl" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{ai.name}</p>
                    <p className="text-[11px] text-muted">
                      ${ai.planPrice}/mo start · {plans} plans · {models} models
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Link href={`/owner/ai/${ai.id}`} className="btn btn-primary !py-1.5 text-xs">
                    Manage listing
                  </Link>
                  <Link href={`/ai/${ai.slug}`} className="btn btn-ghost !py-1.5 text-xs">
                    View public page ↗
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Recent edits</h3>
          <span className="text-[11px] text-muted">Newest first</span>
        </div>
        <div className="mt-2 divide-y divide-line">
          {ownerChangesFor(db, owner.id).slice(0, 8).map((change) => (
            <div key={change.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
              <span
                className={`chip ${
                  change.status === "applied"
                    ? "bg-emerald-50 text-emerald-700"
                    : change.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : change.status === "reverted"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-slate-100 text-slate-500"
                }`}
              >
                {change.status}
              </span>
              <span className="font-medium text-ink">{change.title}</span>
              <span className="text-muted">{change.aiName}</span>
              <span className="ml-auto text-muted">{new Date(change.createdAt).toLocaleString("en-IN")}</span>
            </div>
          ))}
          {ownerChangesFor(db, owner.id).length === 0 ? (
            <p className="py-2 text-xs text-muted">No edits yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
