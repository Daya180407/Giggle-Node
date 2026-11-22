import { savePostAction } from "@/app/actions";
import { POST_TYPE_LABEL } from "@/lib/categories";
import type { Ai, Post } from "@/lib/types";

export default function PostForm({ post, ais }: { post?: Post; ais: Ai[] }) {
  return (
    <form action={savePostAction} className="space-y-3">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <div>
        <label className="label" htmlFor="title">
          Title *
        </label>
        <input id="title" name="title" required defaultValue={post?.title} className="field" />
        <p className="mt-1 text-xs text-muted">The slug is generated from the title automatically (leave it empty).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="slug">
            Slug
          </label>
          <input id="slug" name="slug" defaultValue={post?.slug} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="type">
            Post type
          </label>
          <select id="type" name="type" defaultValue={post?.type ?? "news"} className="field">
            {Object.entries(POST_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={post?.status ?? "draft"} className="field">
            <option value="draft">Draft</option>
            <option value="published">Publish now</option>
            <option value="scheduled">Schedule</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="scheduledAt">
            Publish date & time (for scheduled posts)
          </label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={post?.scheduledAt ? post.scheduledAt.slice(0, 16) : ""}
            className="field"
          />
          <p className="mt-1 text-[11px] text-muted">
            Status “Schedule” + a future date = the post publishes automatically at that time.
          </p>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={post?.featured} className="h-4 w-4 accent-indigo-600" />
          Featured post (larger on the homepage)
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="coverEmoji">
            Cover emoji
          </label>
          <input id="coverEmoji" name="coverEmoji" maxLength={4} defaultValue={post?.coverEmoji ?? "📰"} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="coverImage">
            Cover image URL (optional)
          </label>
          <input id="coverImage" name="coverImage" defaultValue={post?.coverImage} placeholder="https://" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="author">
            Author
          </label>
          <input id="author" name="author" defaultValue={post?.author ?? "GigleNode Team"} className="field" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="excerpt">
          Excerpt (shown on the card)
        </label>
        <textarea id="excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt} className="field" />
      </div>

      <div>
        <label className="label" htmlFor="content">
          Content
        </label>
        <textarea
          id="content"
          name="content"
          rows={14}
          defaultValue={post?.content}
          className="field font-mono text-xs"
          placeholder={"## Heading\n\nWrite a paragraph.\n\n- list item 1\n- list item 2"}
        />
        <p className="mt-1 text-xs text-muted">
          Simple markdown: <code>## Heading</code> and <code>- list item</code> are supported. A blank line starts a new
          paragraph.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="relatedAiIds">
          Related AI (hold Ctrl/Cmd to select multiple)
        </label>
        <select
          id="relatedAiIds"
          name="relatedAiIds"
          multiple
          size={7}
          defaultValue={post?.relatedAiIds ?? []}
          className="field"
        >
          {[...ais]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          Top 10 posts automatically include these AIs' live ranking, and this post appears as “Related Posts” on
          those AI pages.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sponsored" defaultChecked={post?.sponsored} className="h-4 w-4 accent-indigo-600" />
        Sponsored post (shows a label)
      </label>

      <fieldset className="rounded-xl border border-line p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">SEO</legend>
        <div className="mt-1 space-y-2">
          <div>
            <label className="label" htmlFor="seoTitle">
              Meta title (max 70)
            </label>
            <input id="seoTitle" name="seoTitle" defaultValue={post?.seoTitle ?? ""} maxLength={70} className="field" placeholder="Can be left empty if there is no title" />
          </div>
          <div>
            <label className="label" htmlFor="seoDescription">
              Meta description (max 170)
            </label>
            <textarea
              id="seoDescription"
              name="seoDescription"
              rows={2}
              maxLength={170}
              defaultValue={post?.seoDescription ?? ""}
              className="field"
              placeholder="The line shown in search results"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button className="btn btn-primary">{post ? "Save post" : "Create post"}</button>
        <span className="self-center text-xs text-muted">Save as a draft and publish later.</span>
      </div>
    </form>
  );
}
