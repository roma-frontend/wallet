import { describe, it, expect } from "vitest";
import { formatCompact, formatCurrency } from "./format";

describe("formatCompact (Armenian suffixes)", () => {
  it("uses հզր for thousands", () => {
    expect(formatCompact(15000)).toContain("հզր");
  });

  it("uses մլն for millions", () => {
    expect(formatCompact(2_500_000)).toContain("մլն");
  });

  it("uses մլրդ for billions", () => {
    expect(formatCompact(3_000_000_000)).toContain("մլրդ");
  });

  it("leaves small numbers without a suffix", () => {
    const out = formatCompact(500);
    expect(out).not.toContain("հզր");
    expect(out).not.toContain("մլն");
  });
});

describe("formatCurrency", () => {
  it("renders AMD with no fraction digits and the dram symbol", () => {
    expect(formatCurrency(1500, "AMD")).toContain("֏");
  });

  it("uses a minus sign for negative amounts", () => {
    expect(formatCurrency(-100, "AMD").startsWith("−")).toBe(true);
  });

  it("adds a plus sign when sign option is set", () => {
    expect(formatCurrency(100, "AMD", { sign: true }).startsWith("+")).toBe(true);
  });

  it("compacts large amounts when requested", () => {
    expect(formatCurrency(250000, "AMD", { compact: true })).toContain("հզր");
  });
});
