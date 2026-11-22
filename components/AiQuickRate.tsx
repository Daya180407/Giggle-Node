"use client";

import { useState } from "react";
import RatingWidget from "@/components/RatingWidget";
import type { Rating } from "@/lib/types";

type RateModel = { id: string; name: string };

export default function AiQuickRate({
  aiId,
  aiName,
  aiSlug,
  models,
  existingRatings,
  isLoggedIn,
  allowRatings,
}: {
  aiId: string;
  aiName: string;
  aiSlug: string;
  models: RateModel[];
  existingRatings: Rating[];
  isLoggedIn: boolean;
  allowRatings: boolean;
}) {
  // Overall is the default: most visitors rate the product, not one model.
  const [scope, setScope] = useState<"ai" | "model">("ai");
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const selected = models.find((m) => m.id === modelId) ?? models[0];
  const overallExisting = existingRatings.find((r) => !r.modelId && r.aiId === aiId) ?? null;
  const modelExisting = existingRatings.find((r) => r.modelId === modelId) ?? null;
  const showModel = scope === "model" && Boolean(selected);

  return (
    <section className="card p-5" id="rate">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Your turn</p>
          <h2 className="display mt-1 text-lg text-ink">Rate {aiName}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Give one overall rating for the whole product, or a separate rating for a specific model you have used.
          </p>
        </div>
        <span className="chip chip-brand">{models.length ? `${models.length} models` : "Overall rating"}</span>
      </div>

      {models.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Rating target">
          <button
            type="button"
            onClick={() => setScope("ai")}
            aria-pressed={scope === "ai"}
            className={scope === "ai" ? "chip chip-brand" : "chip bg-slate-100 text-slate-600"}
          >
            Overall · {aiName}
          </button>
          <button
            type="button"
            onClick={() => setScope("model")}
            aria-pressed={scope === "model"}
            className={scope === "model" ? "chip chip-brand" : "chip bg-slate-100 text-slate-600"}
          >
            A specific model
          </button>
        </div>
      ) : null}

      {showModel && selected ? (
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
          {showModel && selected ? (
            <RatingWidget
              key={`model-${selected.id}`}
              modelId={selected.id}
              title={`Rate ${selected.name}`}
              existing={modelExisting}
              isLoggedIn={isLoggedIn}
              loginNext={`/ai/${aiSlug}`}
              embedded
            />
          ) : (
            <RatingWidget
              key="overall"
              aiId={aiId}
              title={`Rate ${aiName} overall`}
              existing={overallExisting}
              isLoggedIn={isLoggedIn}
              loginNext={`/ai/${aiSlug}`}
              embedded
            />
          )}
        </div>
      )}
    </section>
  );
}
