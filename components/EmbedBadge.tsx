import CopyButton from "@/components/CopyButton";

/** Shows the vendor how to embed their live rating on their own site. */
export default function EmbedBadge({ slug, name }: { slug: string; name: string }) {
  const src = `https://gigglenode.com/api/badge/${slug}.svg`;
  const snippet = `<a href="https://gigglenode.com/ai/${slug}" rel="noopener"><img src="${src}" alt="${name} rating on GiggleNode" width="250" height="64" loading="lazy"></a>`;

  return (
    <details className="card p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">Embed this rating on your site</summary>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        A live badge that always shows the current weighted score. Free for anyone — just paste the snippet.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-2.5">
        <code className="whitespace-pre text-[10.5px] leading-relaxed text-slate-200">{snippet}</code>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CopyButton text={snippet} />
        <a href={src} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-2.5 !py-1 text-[11px]">
          Preview SVG ↗
        </a>
      </div>
    </details>
  );
}
