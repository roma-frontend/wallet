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
    const swatch = ACCENTS.find((a) => a.key === accent)?.swatch;
    if (!swatch) return;

    const darker = colorMix(swatch, 0.85);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="${encode(swatch)}"/>
      <stop offset="1" stop-color="${encode(darker)}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#g)"/>
  <rect x="202" y="216" width="110" height="80" rx="16" fill="#fff" fill-opacity="0.95"/>
  <circle cx="286" cy="270" r="13" fill="${encode(swatch)}"/>
</svg>`;

    dataUrlRef.current =
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    apply(dataUrlRef.current);

    const obs = new MutationObserver(() => apply(dataUrlRef.current));
    obs.observe(document.head, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [accent]);

  return null;
}

function encode(oklchStr: string): string {
  return oklchStr.replace(/\s+/g, " ").trim();
}

function colorMix(oklchStr: string, factor: number): string {
  const m = oklchStr.match(
    /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)/,
  );
  if (!m) return oklchStr;
  const l = parseFloatCS(m[1]);
  const c = parseFloatCS(m[2]);
  const h = parseFloatCS(m[3]);
  const a = m[4] ? parseFloatCS(m[4]) / 100 : 1;
  return `oklch(${(l * factor).toFixed(3)} ${(c * factor).toFixed(4)} ${h} / ${a})`;
}

function parseFloatCS(v: string): number {
  if (v.endsWith("%")) return parseFloat(v) / 100;
  return parseFloat(v);
}
