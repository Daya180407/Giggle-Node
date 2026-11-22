"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Sends at most one hit per page per browser session. */
export default function TrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const key = `gn_hit:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {
      /* analytics must never break a page */
    });
  }, [pathname]);

  return null;
}
