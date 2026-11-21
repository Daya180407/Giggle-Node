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
        <p className="mt-1 text-xs text-muted">Slug title se automatic ban jayega (khali chhodiye to).</p>
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
            <option value="published">Published</option>
          </select>
        </div>
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
          Excerpt (card pe dikhega)
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
          placeholder={"## Heading\n\nParagraph likhiye.\n\n- list item 1\n- list item 2"}
        />
        <p className="mt-1 text-xs text-muted">
          Simple markdown: <code>## Heading</code> aur <code>- list item</code> support hai. Blank line se paragraph
          break hota hai.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="relatedAiIds">
          Related AI (Ctrl/Cmd dabakar multiple chuniye)
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
          Top 10 post me in AI ki live ranking automatic post ke andar aa jayegi, aur AI pages pe ye post “Related
          Posts” me dikhega.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="sponsored" defaultChecked={post?.sponsored} className="h-4 w-4 accent-indigo-600" />
        Sponsored post (label dikhega)
      </label>

      <div className="flex gap-2">
        <button className="btn btn-primary">{post ? "Save post" : "Create post"}</button>
        <span className="self-center text-xs text-muted">Draft me save karke baad me publish kar sakte hain.</span>
      </div>
    </form>
  );
}
