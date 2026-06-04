import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface BrandLoaderProps {
  /** Center inside the viewport (route-level loader) instead of inline block. */
  fullscreen?: boolean;
  /** Optional caption under the wordmark. Defaults to the localized "loading…". */
  label?: string;
  className?: string;
}

/**
 * The single, project-wide loading indicator: an animated wallet mark with
 * pulsing rings and a shimmering wordmark. Use everywhere a spinner is needed.
 */
export function BrandLoader({ fullscreen, label, className }: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-5",
        fullscreen ? "min-h-[60vh] w-full" : "py-12",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings */}
        <span className="absolute h-16 w-16 animate-ping rounded-2xl bg-primary/25 animation-duration-[1.8s]" />
        <span className="absolute h-20 w-20 animate-ping rounded-3xl bg-primary/10 animation-duration-[2.4s]" />
        {/* Logo tile */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-soft">
          <Wallet className="h-8 w-8 text-white animate-bob" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5">
        <p className="text-lg font-bold tracking-tight animate-shine">{t.appName}</p>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70" />
        </div>
      </div>

      <span className="sr-only">{label ?? t.common.loading}</span>
    </div>
  );
}
