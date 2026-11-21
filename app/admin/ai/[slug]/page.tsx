import Link from "next/link";
import { notFound } from "next/navigation";
import AiForm from "@/components/admin/AiForm";
import ModelEditor from "@/components/admin/ModelEditor";
import PromptEditor from "@/components/admin/PromptEditor";
import { AiLogo, Stars } from "@/components/ui";
import { buildView } from "@/lib/rank";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminAiEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = readDb();
  const ai = db.ai.find((a) => a.slug === slug);
  if (!ai) notFound();

  const view = buildView(db);
  const stat = view.aiStats.get(ai.id);
  const models = db.models.filter((m) => m.aiId === ai.id);
  const stats: Record<string, { score: number; votes: number }> = {};
  for (const m of models) {
    const s = view.modelStats.get(m.id);
    if (s) stats[m.id] = { score: s.score, votes: s.votes };
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <AiLogo logo={ai.logo} color={ai.color} size={44} />
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
          <span className="text-xs text-muted">Rating aur ranking model level par hoti hai</span>
        </div>
        <ModelEditor aiId={ai.id} aiSlug={ai.slug} models={models} stats={stats} />
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
