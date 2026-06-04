import { describe, it, expect } from "vitest";
import { convert } from "./currencies";
import type { ExchangeRates } from "./types";

const rates: ExchangeRates = {
  base: "AMD",
  rates: { AMD: 1, USD: 0.0025, EUR: 0.002 },
  fetchedAt: 0,
};

describe("convert", () => {
  it("returns the same amount when currencies match", () => {
    expect(convert(1000, "AMD", "AMD", rates)).toBe(1000);
    expect(convert(50, "USD", "USD", rates)).toBe(50);
  });

  it("converts from the base currency", () => {
    expect(convert(1000, "AMD", "USD", rates)).toBeCloseTo(2.5, 6);
  });

  it("converts to the base currency", () => {
    expect(convert(2.5, "USD", "AMD", rates)).toBeCloseTo(1000, 6);
  });

  it("converts between two non-base currencies", () => {
    // 2.5 USD -> 1000 AMD -> 2 EUR
    expect(convert(2.5, "USD", "EUR", rates)).toBeCloseTo(2, 6);
  });

  it("falls back to the original amount when a rate is missing", () => {
    expect(convert(100, "USD", "GBP", rates)).toBe(100);
  });
});
