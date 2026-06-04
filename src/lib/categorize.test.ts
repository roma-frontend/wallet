import { describe, it, expect } from "vitest";
import { suggestCategory } from "./categorize";

const FOOD = "cat_food";
const TRANSPORT = "cat_transport";
const valid = new Set([FOOD, TRANSPORT]);

const history = [
  { type: "expense" as const, note: "Coffee at the cafe", categoryId: FOOD },
  { type: "expense" as const, note: "Lunch cafe downtown", categoryId: FOOD },
  { type: "expense" as const, note: "Taxi ride home", categoryId: TRANSPORT },
  { type: "expense" as const, note: "Bus ticket", categoryId: TRANSPORT },
];

describe("suggestCategory", () => {
  it("suggests the category most associated with the note's words", () => {
    expect(suggestCategory("Morning cafe coffee", "expense", history, valid)).toBe(FOOD);
    expect(suggestCategory("Taxi to airport", "expense", history, valid)).toBe(TRANSPORT);
  });

  it("returns null for an empty or signal-less note", () => {
    expect(suggestCategory("", "expense", history, valid)).toBeNull();
    expect(suggestCategory("xyz qqq", "expense", history, valid)).toBeNull();
  });

  it("ignores history of a different transaction type", () => {
    expect(suggestCategory("Coffee", "income", history, valid)).toBeNull();
  });

  it("never suggests a category id that is not in the valid set", () => {
    const result = suggestCategory("Coffee taxi", "expense", history, new Set([TRANSPORT]));
    expect(result === null || result === TRANSPORT).toBe(true);
  });

  it("ignores short words and stopwords", () => {
    // "the", "at" are stopwords/too short, so a note made only of them yields null.
    expect(suggestCategory("at the", "expense", history, valid)).toBeNull();
  });
});
