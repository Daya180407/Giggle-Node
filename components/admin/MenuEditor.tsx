"use client";

import { useState } from "react";
import { saveMenuAction } from "@/app/actions";
import type { MenuItem } from "@/lib/types";

type Row = MenuItem;

export default function MenuEditor({ items }: { items: MenuItem[] }) {
  const [rows, setRows] = useState<Row[]>(items);
  const [dragging, setDragging] = useState<number | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((item) => [item.id, item.visible])),
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    setRows((current) => {
      const next = [...current];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form action={saveMenuAction}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold">Menu control</h3>
          <p className="text-xs text-muted">
            Drag rows to reorder. Header links appear in the top navigation; footer links sit next to Contact.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setRows((current) => [
              ...current,
              {
                id: `menu_${Date.now().toString(36)}`,
                label: "New link",
                href: "/",
                location: "header",
                visible: true,
              },
            ])
          }
          className="btn btn-ghost !py-1.5 text-[11px]"
        >
          + Add link
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {rows.map((row, index) => {
          const checked = visible[row.id] ?? row.visible;
          return (
            <div
              key={row.id}
              draggable
              onDragStart={() => setDragging(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging !== null) move(dragging, index);
                setDragging(null);
              }}
              className={`grid gap-1.5 rounded-xl border border-line bg-slate-50/60 p-2 sm:grid-cols-[auto_1fr_1.2fr_110px_auto_auto] sm:items-center ${
                dragging === index ? "opacity-50" : ""
              }`}
            >
              <span className="cursor-grab px-1 text-slate-400" title="Drag to reorder" aria-hidden>
                ⠿
              </span>
              <input
                name="menuId"
                type="hidden"
                value={row.id}
                readOnly
              />
              <input
                name="menuLabel"
                value={row.label}
                onChange={(event) => update(index, { label: event.target.value })}
                maxLength={40}
                aria-label="Link label"
                className="field !py-1.5 text-xs"
              />
              <input
                name="menuHref"
                value={row.href}
                onChange={(event) => update(index, { href: event.target.value })}
                maxLength={160}
                aria-label="Link URL"
                className="field !py-1.5 text-xs"
                placeholder="/category/all"
              />
              <select
                name="menuLocation"
                value={row.location}
                onChange={(event) => update(index, { location: event.target.value as Row["location"] })}
                aria-label="Menu location"
                className="field !py-1.5 text-xs"
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
              </select>
              <label className="flex items-center gap-1 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  name="menuVisible"
                  value={String(index)}
                  checked={checked}
                  onChange={(event) => setVisible((current) => ({ ...current, [row.id]: event.target.checked }))}
                  className="h-4 w-4 accent-indigo-600"
                />
                Show
              </label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, index - 1)} className="px-1 text-slate-500" aria-label="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => move(index, index + 1)} className="px-1 text-slate-500" aria-label="Move down">
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  className="px-1 text-rose-600"
                  aria-label="Remove link"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
            No extra links. The built-in navigation stays unchanged.
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex justify-end">
        <button className="btn btn-primary !py-2 text-xs">Save menu</button>
      </div>
    </form>
  );
}
