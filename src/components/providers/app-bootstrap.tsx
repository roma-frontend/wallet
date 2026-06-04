"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrencyStore } from "@/store/use-currency-store";
import { usePrefsStore } from "@/store/use-prefs-store";
import { useMe, useBaseCurrency, useSettingsMutations } from "@/hooks/use-data";

/**
 * Boots the authenticated app:
 *  - seeds default categories + settings on first sign-in
 *  - keeps live exchange rates in sync with the user's base currency
 *  - redirects to the user's preferred landing page on first load
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const baseCurrency = useBaseCurrency();
  const refreshRates = useCurrencyStore((s) => s.refreshRates);
  const defaultPage = usePrefsStore((s) => s.defaultPage);
  const { bootstrap } = useSettingsMutations();
  const seeded = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  // Seed defaults once when a signed-in user has no settings yet.
  useEffect(() => {
    if (me && !me.settings && !seeded.current) {
      seeded.current = true;
      void bootstrap({ userName: me.name ?? undefined });
    }
  }, [me, bootstrap]);

  useEffect(() => {
    refreshRates(baseCurrency);
  }, [baseCurrency, refreshRates]);

  // On the very first visit of a browser session, jump to the preferred page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("dp-landed")) return;
    sessionStorage.setItem("dp-landed", "1");
    if (pathname === "/" && defaultPage && defaultPage !== "/") {
      router.replace(defaultPage);
    }
  }, [pathname, defaultPage, router]);

  return <>{children}</>;
}
