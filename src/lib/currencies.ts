import type { CurrencyCode, ExchangeRates } from "./types";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  /** Armenian name */
  name: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "AMD", symbol: "֏", name: "Հայկական դրամ" },
  { code: "USD", symbol: "$", name: "ԱՄՆ դոլար" },
  { code: "EUR", symbol: "€", name: "Եվրո" },
  { code: "RUB", symbol: "₽", name: "Ռուսական ռուբլի" },
  { code: "GBP", symbol: "£", name: "Բրիտանական ֆունտ" },
  { code: "GEL", symbol: "₾", name: "Վրացական լարի" },
  { code: "CHF", symbol: "₣", name: "Շվեյցարական ֆրանկ" },
  { code: "JPY", symbol: "¥", name: "Ճապոնական իեն" },
  { code: "CNY", symbol: "¥", name: "Չինական յուան" },
  { code: "TRY", symbol: "₺", name: "Թուրքական լիրա" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Offline fallback rates relative to 1 AMD (approximate).
 * Used only when the live API is unreachable so the app keeps working.
 */
export const FALLBACK_RATES: ExchangeRates = {
  base: "AMD",
  rates: {
    AMD: 1,
    USD: 0.0026,
    EUR: 0.0024,
    RUB: 0.2,
    GBP: 0.002,
    GEL: 0.007,
    CHF: 0.0023,
    JPY: 0.38,
    CNY: 0.018,
    TRY: 0.084,
  },
  fetchedAt: 0,
};

/**
 * Convert an amount between two currencies using rates expressed
 * relative to a single base currency (rates[X] = X per 1 base).
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRates,
): number {
  if (from === to) return amount;
  const base = rates.base;
  const fromRate = from === base ? 1 : rates.rates[from];
  const toRate = to === base ? 1 : rates.rates[to];
  if (!fromRate || !toRate) return amount;
  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}

const API = "https://open.er-api.com/v6/latest";

/**
 * Fetch live exchange rates for the given base currency.
 * Source: open.er-api.com (free, keyless, supports AMD).
 */
export async function fetchRates(base: CurrencyCode): Promise<ExchangeRates> {
  const res = await fetch(`${API}/${base}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Rates request failed: ${res.status}`);
  const data = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (data.result !== "success" || !data.rates) {
    throw new Error("Invalid rates response");
  }
  return { base, rates: data.rates, fetchedAt: Date.now() };
}
