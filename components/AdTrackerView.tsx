"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible impression beacon. It fires once when the sponsored element is at
 * least a third visible, so a card below the fold is not counted before anyone
 * could have seen it. Every sponsored chat card and list row mounts one.
 */
export default function AdTrackerView({
  kind,
  id,
  enabled = true,
}: {
  kind: "chat" | "placement";
  id: string;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (!enabled || sent.current) return;
    const element = ref.current;
    if (!element) return;

    const send = () => {
      if (sent.current) return;
      sent.current = true;
      void fetch("/api/ads/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
        keepalive: true,
      }).catch(() => {});
    };

    if (typeof IntersectionObserver === "undefined") {
      send();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          send();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [kind, id, enabled]);

  return <span ref={ref} aria-hidden data-ad-view={id} className="hidden" />;
}
