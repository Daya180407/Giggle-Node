import { deletePromptAction, savePromptAction } from "@/app/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import type { Prompt } from "@/lib/types";

export default function PromptEditor({
  aiId,
  aiSlug,
  prompts,
}: {
  aiId: string;
  aiSlug: string;
  prompts: Prompt[];
}) {
  return (
    <div className="space-y-3">
      {prompts.map((p) => (
        <details key={p.id} className="rounded-xl border border-line p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            <span className="text-xs text-brand">Edit ▾</span>
          </summary>
          <form action={savePromptAction} className="mt-2 space-y-2">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="aiId" value={aiId} />
            <input type="hidden" name="aiSlug" value={aiSlug} />
            <input name="title" defaultValue={p.title} className="field" />
            <textarea name="promptText" rows={3} defaultValue={p.promptText} className="field" />
            <button className="btn btn-primary !py-1.5 text-xs">Save prompt</button>
          </form>
          <form action={deletePromptAction} className="mt-2">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="aiSlug" value={aiSlug} />
            <DeleteButton label="Delete prompt" message="Prompt delete karna hai?" />
          </form>
        </details>
      ))}

      <div className="rounded-xl border border-dashed border-line p-3">
        <h3 className="text-sm font-semibold">+ Naya prompt</h3>
        <form action={savePromptAction} className="mt-2 space-y-2">
          <input type="hidden" name="aiId" value={aiId} />
          <input type="hidden" name="aiSlug" value={aiSlug} />
          <input name="title" required placeholder="Prompt ka title" className="field" />
          <textarea name="promptText" required rows={3} placeholder="Prompt text" className="field" />
          <button className="btn btn-ghost !py-1.5 text-xs">Add prompt</button>
        </form>
      </div>
    </div>
  );
}
