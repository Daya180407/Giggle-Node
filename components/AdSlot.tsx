"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({
  clientId,
  slotId,
  variant = "banner",
}: {
  clientId: string;
  slotId: string;
  variant?: "banner" | "sidebar" | "inline";
}) {
  const pushed = useRef(false);
  const valid = /^ca-pub-\d{16}$/.test(clientId) && /^\d+$/.test(slotId);

  useEffect(() => {
    if (!valid || pushed.current) return;
    let cancelled = false;
    let attempts = 0;

    const push = () => {
      if (cancelled) return;
      if (Array.isArray(window.adsbygoogle)) {
        try {
          window.adsbygoogle.push({});
          pushed.current = true;
        } catch {
          // Ad blockers and unfilled inventory can reject the request; leave the slot empty.
        }
        return;
      }
      if (attempts++ < 20) window.setTimeout(push, 300);
    };

    push();
    return () => {
      cancelled = true;
    };
  }, [valid, clientId, slotId]);

  if (!valid) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`overflow-hidden rounded-xl border border-line bg-white/70 ${
        variant === "sidebar" ? "min-h-[250px]" : variant === "inline" ? "min-h-[120px]" : "min-h-[90px]"
      }`}
    >
      <p className="px-3 pt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Advertisement</p>
      <ins
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={variant === "sidebar" ? "rectangle" : "auto"}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
