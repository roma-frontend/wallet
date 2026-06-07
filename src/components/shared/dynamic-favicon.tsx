"use client";

import { useEffect, useRef } from "react";
import { usePrefsStore, ACCENTS } from "@/store/use-prefs-store";

export function DynamicFavicon() {
  const accent = usePrefsStore((s) => s.accent);
  const dataUrlRef = useRef("");

  const apply = (url: string) => {
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
      .forEach((l) => (l.href = url));
  };

  useEffect(() => {
    const meta = ACCENTS.find((a) => a.key === accent);
    if (!meta) return;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="${meta.favicon}"/>
      <stop offset="1" stop-color="${meta.faviconDark}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#g)"/>
  <rect x="202" y="216" width="110" height="80" rx="16" fill="#fff" fill-opacity="0.95"/>
  <circle cx="286" cy="270" r="13" fill="${meta.favicon}"/>
</svg>`;

    const bytes = new TextEncoder().encode(svg);
    const binary = String.fromCodePoint(...bytes);
    dataUrlRef.current = `data:image/svg+xml;base64,${btoa(binary)}`;
    apply(dataUrlRef.current);

    const obs = new MutationObserver(() => apply(dataUrlRef.current));
    obs.observe(document.head, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [accent]);

  return null;
}
