import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./ratelimit";

describe("checkRateLimit (in-memory)", () => {
  it("allows the first 20 hits then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reset).toBeGreaterThan(0);
  });

  it("keeps separate windows per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 20; i++) checkRateLimit(a);
    expect(checkRateLimit(a).allowed).toBe(false);
    expect(checkRateLimit(b).allowed).toBe(true);
  });
});
