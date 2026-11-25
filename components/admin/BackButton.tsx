"use client";

import { useRouter } from "next/navigation";

/** Browser back button for pages that do not sit under a section header. */
export default function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/admin");
      }}
      className="btn border border-white/15 bg-white/[0.06] !py-2 text-xs text-white hover:bg-white/10"
    >
      ← {label}
    </button>
  );
}
