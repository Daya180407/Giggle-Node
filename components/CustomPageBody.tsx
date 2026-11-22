import type { ReactNode } from "react";
import { PAGE_INFO, parsePageBody } from "@/lib/pages";
import type { CustomPage } from "@/lib/types";

export default function CustomPageBody({
  page,
  embedded = false,
  children,
}: {
  page: CustomPage;
  embedded?: boolean;
  children?: ReactNode;
}) {
  const blocks = parsePageBody(page.body);
  const info = PAGE_INFO[page.slug as keyof typeof PAGE_INFO];

  const content = (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2 key={index} className="display pt-3 text-lg text-ink">
              {block.text}
            </h2>
          );
        }
        if (block.type === "h3") {
          return (
            <h3 key={index} className="text-sm font-bold text-ink">
              {block.text}
            </h3>
          );
        }
        if (block.type === "li") {
          return (
            <p key={index} className="flex gap-2 pl-1 text-sm leading-relaxed text-slate-600">
              <span className="text-brand">•</span>
              <span>{block.text}</span>
            </p>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={index}
              className="rounded-r-xl border-l-4 border-indigo-200 bg-indigo-50/50 px-3 py-2 text-sm text-slate-700"
            >
              {block.text}
            </blockquote>
          );
        }
        return (
          <p key={index} className="text-sm leading-relaxed text-slate-600">
            {block.text}
          </p>
        );
      })}
      {children}
    </div>
  );

  if (embedded) {
    return (
      <section className="card p-5 sm:p-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="display text-lg text-ink">{page.title}</h2>
          <span className="text-[11px] text-muted">
            Updated {new Date(page.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {content}
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="page-hero">
        <span className="chip chip-brand">{info?.label ?? "Page"}</span>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">{page.title}</h1>
        {page.subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{page.subtitle}</p> : null}
        <p className="mt-2 text-xs text-muted">
          Last updated{" "}
          {new Date(page.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </header>
      <div className="card mt-6 p-5 sm:p-7">{content}</div>
    </div>
  );
}
