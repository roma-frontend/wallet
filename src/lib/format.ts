import type { CurrencyCode } from "./types";
import { currencyMeta } from "./currencies";
import { MONTHS_HY } from "./i18n";

const LOCALE = "hy-AM";

/** Armenian compact suffixes: հազար / միլիոն / միլիարդ / տրիլիոն. */
const COMPACT_TIERS: { value: number; suffix: string }[] = [
  { value: 1e12, suffix: "տրլն" },
  { value: 1e9, suffix: "մլրդ" },
  { value: 1e6, suffix: "մլն" },
  { value: 1e3, suffix: "հզր" },
];

/** Format a number compactly with Armenian suffixes, e.g. 585000 → "585 հզր". */
function compactArmenian(value: number): string {
  const abs = Math.abs(value);
  const tier = COMPACT_TIERS.find((t) => abs >= t.value);
  if (!tier) {
    return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(value);
  }
  const scaled = value / tier.value;
  const digits = Math.abs(scaled) < 10 ? 1 : 0;
  const num = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(scaled);
  return `${num} ${tier.suffix}`;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  opts: { compact?: boolean; sign?: boolean } = {},
): string {
  const { compact = false, sign = false } = opts;
  const meta = currencyMeta(currency);
  const fractionDigits = currency === "AMD" || currency === "JPY" ? 0 : 2;

  const useCompact = compact && Math.abs(amount) >= 100000;
  const formatted = useCompact
    ? compactArmenian(Math.abs(amount))
    : new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
      }).format(Math.abs(amount));

  const prefix = sign ? (amount < 0 ? "−" : "+") : amount < 0 ? "−" : "";
  return `${prefix}${formatted} ${meta.symbol}`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Compact number with Armenian suffixes (no currency), e.g. for chart axes. */
export function formatCompact(value: number): string {
  return compactArmenian(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/** Format an ISO date (yyyy-MM-dd) as "12 Հունվար 2026". */
export function formatDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_HY[d.getMonth()]} ${d.getFullYear()}`;
}

/** Short date "12 Հնվ". */
export function formatDateShort(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_HY[d.getMonth()].slice(0, 3)}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_HY[month]} ${year}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Relative label: Այսօր / Երեկ / formatted date. */
export function relativeDate(iso: string): string {
  const today = todayISO();
  const yest = toISODate(new Date(Date.now() - 86400000));
  if (iso === today) return "Այսօր";
  if (iso === yest) return "Երեկ";
  return formatDate(iso);
}
