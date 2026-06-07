"use client";

import { useEffect, useRef } from "react";
import { usePrefsStore, ACCENTS } from "@/store/use-prefs-store";

/**
 * Redraws the favicon as a 32×32 wallet icon tinted with
 * the current accent colour. Runs on mount and whenever the
 * accent preference changes.
 */
export function DynamicFavicon() {
  const accent = usePrefsStore((s) => s.accent);
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const swatch = ACCENTS.find((a) => a.key === accent)?.swatch;
    if (!swatch || prevRef.current === accent) return;
    prevRef.current = accent;

    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.38;
    const ringR = size * 0.4;
    const innerGap = 2;

    // Background
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, size, size);

    // Outer ring (gradient tinted with accent)
    const grad = ctx.createLinearGradient(
      cx - r,
      cy - r,
      cx + r,
      cy + r,
    );
    grad.addColorStop(0, swatch);
    grad.addColorStop(
      1,
      colorMix(swatch, 0.7),
    );

    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner cutout
    ctx.beginPath();
    ctx.arc(cx, cy, ringR - innerGap, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Dot at bottom centre
    const dotY = cy + ringR - innerGap - 1;
    ctx.beginPath();
    ctx.arc(cx, dotY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = swatch;
    ctx.fill();

    // Strap lines (top)
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - ringR + innerGap);
    ctx.lineTo(cx - 1, cy - r);
    ctx.moveTo(cx + 3, cy - ringR + innerGap);
    ctx.lineTo(cx + 1, cy - r);
    ctx.strokeStyle = swatch;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const dataUrl = canvas.toDataURL("image/png");

    let link = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"]',
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = dataUrl;
  }, [accent]);

  return null;
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
