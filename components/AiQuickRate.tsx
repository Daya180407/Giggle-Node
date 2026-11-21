"use client";

import { useState } from "react";
import RatingWidget from "@/components/RatingWidget";
import type { Rating } from "@/lib/types";

type RateModel = { id: string; name: string };

export default function AiQuickRate({
  aiSlug,
  models,
  existingRatings,
  isLoggedIn,
  allowRatings,
}: {
  aiSlug: string;
  models: RateModel[];
  existingRatings: Rating[];
  isLoggedIn: boolean;
  allowRatings: boolean;
}) {
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const selected = models.find((m) => m.id === modelId) ?? models[0];
  const existing = existingRatings.find((r) => r.modelId === modelId) ?? null;

  if (!selected) return null;

  return (
    <section className="card p-5" id="rate">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Your turn</p>
          <h2 className="display mt-1 text-lg text-ink">Rate this AI</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Ratings are model-level — pick the model you actually used, then leave 1–5 stars.
          </p>
        </div>
        <span className="chip chip-brand">{models.length} models</span>
      </div>

      {models.length > 1 ? (
        <div className="mt-3">
          <label className="label" htmlFor="rate-model">
            Which model did you use?
          </label>
          <select
            id="rate-model"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            className="field max-w-sm !py-2 text-sm"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!allowRatings ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Ratings are temporarily paused by the administrator.
        </p>
      ) : (
        <div className="mt-3">
          <RatingWidget
            key={selected.id}
            modelId={selected.id}
            existing={existing}
            isLoggedIn={isLoggedIn}
            loginNext={`/ai/${aiSlug}`}
            embedded
          />
        </div>
      )}
    </section>
  );
}
