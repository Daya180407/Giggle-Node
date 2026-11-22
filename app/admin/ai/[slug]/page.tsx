import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewContributionAction } from "@/app/actions";
import AiForm from "@/components/admin/AiForm";
import ModelEditor from "@/components/admin/ModelEditor";
import PromptEditor from "@/components/admin/PromptEditor";
import { AiLogo, Stars } from "@/components/ui";
import { requireAreaPage } from "@/lib/permissions";
import { buildView } from "@/lib/rank";
import { CONTRIBUTION_LABEL, pendingContributions } from "@/lib/contributions";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAiEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAreaPage("catalogue");
  const { slug } = await params;
  const { saved } = await searchParams;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai) notFound();

  const view = buildView(db);
  const stat = view.aiStats.get(ai.id);
  const models = db.models.filter((m) => m.aiId === ai.id);
  const requests = pendingContributions(db, ai.id);
  const stats: Record<string, { score: number; votes: number }> = {};
  for (const m of models) {
    const s = view.modelStats.get(m.id);
    if (s) stats[m.id] = { score: s.score, votes: s.votes };
  }

  return (
    <div className="space-y-5">
      {saved ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          Saved. {ai.name} ki details, plans aur models public site par update ho gaye.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <AiLogo slug={ai.slug} logo={ai.logo} color={ai.color} size={44} />
          <div>
            <h2 className="text-lg font-bold">{ai.name}</h2>
            <div className="flex items-center gap-1.5">
              <Stars value={stat?.score ?? 0} size={12} />
              <span className="text-xs text-muted">
                {stat?.score.toFixed(2)} · {stat?.votes} votes · {models.length} models
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/ai/${ai.slug}`} className="btn btn-ghost text-xs">
            Public page →
          </Link>
          <Link href="/admin/ai" className="btn btn-ghost text-xs">
            ← Saare AI
          </Link>
        </div>
      </div>

      <section className="card p-4">
        <h3 className="mb-3 text-sm font-bold">AI Details</h3>
        <AiForm ai={ai} allAis={db.ai} />
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Models ({models.length})</h3>
          <span className="text-xs text-muted">Rating, best-for aur API pricing model level par</span>
        </div>
        <ModelEditor ai={ai} aiSlug={ai.slug} models={models} stats={stats} />
      </section>

      <section className="card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">User requests for {ai.name} ({requests.length})</h3>
          <span className="text-xs text-muted">
            Approving adds the plan, model or price here — no research needed.
          </span>
        </div>
        {requests.length ? (
          <div className="divide-y divide-line">
            {requests.map((row) => (
              <div key={row.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-brand-soft text-brand">{CONTRIBUTION_LABEL[row.type]}</span>
                  <span className="text-sm font-bold text-ink">{row.title}</span>
                  <span className="ml-auto text-[11px] text-muted">
                    {new Date(row.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{row.note}</p>
                <p className="mt-1 text-[11px] text-muted">
                  From {row.userName} · {row.userEmail}
                  {row.sourceUrl ? (
                    <>
                      {" · "}
                      <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">
                        source ↗
                      </a>
                    </>
                  ) : null}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <form action={reviewContributionAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <input type="hidden" name="back" value={`/admin/ai/${ai.slug}`} />
                    <button className="btn btn-primary !px-3 !py-1 text-[11px]">Approve</button>
                  </form>
                  <form action={reviewContributionAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <input type="hidden" name="back" value={`/admin/ai/${ai.slug}`} />
                    <input name="reviewNote" maxLength={300} placeholder="Reason" className="field !w-40 !py-1 text-[11px]" aria-label="Rejection reason" />
                    <button className="btn btn-ghost !px-3 !py-1 text-[11px]">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">
            No pending user requests. Everything sent from the public page is listed here for a one-click approval.
          </p>
        )}
      </section>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Prompt Library</h3>
          <span className="text-xs text-muted">{db.prompts.filter((p) => p.aiId === ai.id).length} prompts</span>
        </div>
        <PromptEditor aiId={ai.id} aiSlug={ai.slug} prompts={db.prompts.filter((p) => p.aiId === ai.id)} />
      </section>
    </div>
  );
}
