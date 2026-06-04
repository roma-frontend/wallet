/**
 * Lightweight auto-categorisation.
 *
 * Learns from the user's own history: it tokenises the notes of past
 * transactions and remembers which category each word most often maps to.
 * When the user types a new note, the most strongly-associated category is
 * suggested. No AI call, fully local and instant.
 */

interface MinimalTx {
  type: "income" | "expense";
  note?: string;
  categoryId?: string;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "los", "and",
  "և", "ու", "կամ", "հետ", "ից", "ին", "ում",
  "за", "на", "по", "из", "от", "для",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Suggest a category id for a free-form note, based on the categories most
 * frequently used with the same words in the past. Returns null when there's
 * not enough signal.
 */
export function suggestCategory(
  note: string,
  type: "income" | "expense",
  transactions: MinimalTx[],
  validCategoryIds: Set<string>,
): string | null {
  const words = tokenize(note);
  if (words.length === 0) return null;

  // word -> (categoryId -> count)
  const index = new Map<string, Map<string, number>>();
  for (const tx of transactions) {
    if (tx.type !== type || !tx.categoryId || !tx.note) continue;
    if (!validCategoryIds.has(tx.categoryId)) continue;
    for (const w of tokenize(tx.note)) {
      const byCat = index.get(w) ?? new Map<string, number>();
      byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + 1);
      index.set(w, byCat);
    }
  }

  const scores = new Map<string, number>();
  for (const w of words) {
    const byCat = index.get(w);
    if (!byCat) continue;
    for (const [catId, count] of byCat) {
      scores.set(catId, (scores.get(catId) ?? 0) + count);
    }
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const [catId, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = catId;
    }
  }

  return best;
}
