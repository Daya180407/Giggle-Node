"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Scrollable chat body; opens at the newest message like a messaging app. */
export default function CommunityChatScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);

  return (
    <div ref={ref} className="chat-scroll chat-wallpaper min-h-0 flex-1 overflow-y-auto px-2 py-3 sm:px-4">
      {children}
    </div>
  );
}
