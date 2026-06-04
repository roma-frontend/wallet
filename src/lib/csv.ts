/**
 * CSV import/export for transactions.
 *
 * Export produces a spreadsheet-friendly file (opens in Excel/Sheets) using
 * human-readable column headers. Import parses the same shape back, tolerating
 * quoted fields, embedded commas and a leading UTF-8 BOM. Category and account
 * are matched by name on the server side.
 */

export interface CsvTransactionRow {
  date: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  categoryName?: string;
  accountName?: string;
  note?: string;
}

const HEADERS = ["Date", "Type", "Amount", "Currency", "Category", "Account", "Note"] as const;

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialise transactions to a CSV string (with header + UTF-8 BOM). */
export function transactionsToCsv(rows: CsvTransactionRow[]): string {
  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.type,
        String(r.amount),
        r.currency,
        r.categoryName ?? "",
        r.accountName ?? "",
        r.note ?? "",
      ]
        .map((c) => escapeCell(c))
        .join(","),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

/** Parse a single CSV line into cells, honouring quotes and "" escapes. */
function parseLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export interface CsvParseResult {
  rows: CsvTransactionRow[];
  skipped: number;
}

/**
 * Parse a CSV string into transaction rows. Maps columns by header name so
 * column order is flexible. Rows with an invalid date or amount are skipped.
 */
export function parseTransactionsCsv(text: string): CsvParseResult {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const col = {
    date: idx(["date", "ամսաթիվ"]),
    type: idx(["type", "տեսակ"]),
    amount: idx(["amount", "գումար"]),
    currency: idx(["currency", "արժույթ"]),
    category: idx(["category", "կատեգորիա"]),
    account: idx(["account", "հաշիվ"]),
    note: idx(["note", "նշում"]),
  };

  const rows: CsvTransactionRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const get = (c: number) => (c >= 0 && c < cells.length ? cells[c].trim() : "");

    const dateRaw = get(col.date);
    const date = normaliseDate(dateRaw);
    const amount = Number(get(col.amount).replace(/[^\d.,-]/g, "").replace(",", "."));
    if (!date || !Number.isFinite(amount) || amount === 0) {
      skipped++;
      continue;
    }

    const typeRaw = get(col.type).toLowerCase();
    const type: "income" | "expense" =
      typeRaw.startsWith("inc") || typeRaw.includes("եկ") ? "income" : "expense";

    rows.push({
      date,
      type,
      amount: Math.abs(amount),
      currency: get(col.currency).toUpperCase() || "AMD",
      categoryName: get(col.category) || undefined,
      accountName: get(col.account) || undefined,
      note: get(col.note) || undefined,
    });
  }

  return { rows, skipped };
}

/** Normalise common date formats to ISO yyyy-MM-dd. Returns "" if unparseable. */
function normaliseDate(raw: string): string {
  if (!raw) return "";
  // Already ISO.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy
  const m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}
