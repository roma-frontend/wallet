"use client";

import { useEffect } from "react";
import { usePrefsStore } from "@/store/use-prefs-store";

/**
 * Applies device-local visual preferences (accent colour, layout density,
 * privacy blur) to the document root. The actual styling lives in globals.css
 * keyed off the `data-accent` / `data-density` / `data-privacy` attributes.
 *
 * A matching inline script in the root layout sets these attributes before
 * first paint to avoid a flash; this keeps them in sync on later changes.
 */
export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const accent = usePrefsStore((s) => s.accent);
  const density = usePrefsStore((s) => s.density);
  const privacy = usePrefsStore((s) => s.privacy);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    root.dataset.density = density;
    root.dataset.privacy = privacy ? "on" : "off";
  }, [accent, density, privacy]);

  return <>{children}</>;
}
