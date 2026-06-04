import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExchangeRates, CurrencyCode } from "@/lib/types";
import { FALLBACK_RATES, fetchRates } from "@/lib/currencies";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CurrencyState {
  rates: ExchangeRates;
  loading: boolean;
  error: string | null;
  refreshRates: (base: CurrencyCode) => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      rates: FALLBACK_RATES,
      loading: false,
      error: null,

      refreshRates: async (base) => {
        const { rates } = get();
        const age = Date.now() - rates.fetchedAt;
        if (rates.base === base && age < CACHE_TTL) return;

        set({ loading: true, error: null });
        try {
          const fresh = await fetchRates(base);
          set({ rates: fresh, loading: false });
        } catch (e) {
          set({ loading: false, error: String(e) });
        }
      },
    }),
    { name: "dramapanak-rates" },
  ),
);
