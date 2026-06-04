import { v } from "convex/values";
import { query, internalQuery } from "./_generated/server";
import { requireUser } from "./helpers";
import { decryptSecret } from "./crypto";
import { Id } from "./_generated/dataModel";

function pad(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Resolve the [from, to] ISO range for a named period anchored on monthStartDay. */
function periodRange(period: "daily" | "weekly" | "monthly", monthStartDay: number) {
  const now = new Date();
  if (period === "daily") {
    const day = pad(now);
    return { from: day, to: day };
  }
  if (period === "weekly") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { from: pad(start), to: pad(now) };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), monthStartDay);
  if (start > now) start.setMonth(start.getMonth() - 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return { from: pad(start), to: pad(end) };
}

/**
 * Raw financial data for a period, used by Telegram reports and AI features.
 * Currency conversion is applied by the caller (it needs live rates).
 */
export const periodData = query({
  args: {
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  },
  handler: async (ctx, { period }) => {
    const userId = await requireUser(ctx);

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const baseCurrency = settings?.baseCurrency ?? "AMD";
    const monthStartDay = settings?.monthStartDay ?? 1;
    const userName = settings?.userName ?? "";

    const { from, to } = periodRange(period, monthStartDay);

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const catName = new Map(categories.map((c) => [c._id, c.name]));

    const allTx = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from).lte("date", to))
      .collect();

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      baseCurrency,
      userName,
      from,
      to,
      transactions: allTx.map((tx) => ({
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        categoryId: tx.categoryId ?? null,
        categoryName: tx.categoryId ? (catName.get(tx.categoryId) ?? null) : null,
        date: tx.date,
        note: tx.note ?? null,
      })),
      budgets: budgets.map((b) => ({
        categoryId: b.categoryId,
        categoryName: catName.get(b.categoryId) ?? "",
        amount: b.amount,
      })),
    };
  },
});

/**
 * Internal: this-month expense transactions for one category + that category's
 * budget for one user (no auth context). Used by transaction-triggered Telegram
 * budget alerts.
 */
export const monthBudgetDataForUser = internalQuery({
  args: { userId: v.id("users"), categoryId: v.id("categories") },
  handler: async (ctx, { userId, categoryId }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const baseCurrency = settings?.baseCurrency ?? "AMD";
    const monthStartDay = settings?.monthStartDay ?? 1;

    const { from, to } = periodRange("monthly", monthStartDay);

    const category = await ctx.db.get(categoryId);

    const allTx = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).gte("date", from).lte("date", to))
      .collect();

    const budget = await ctx.db
      .query("budgets")
      .withIndex("by_user_category", (q) => q.eq("userId", userId).eq("categoryId", categoryId))
      .unique();

    return {
      baseCurrency,
      categoryName: category?.name ?? "",
      budgetAmount: budget?.amount ?? 0,
      transactions: allTx
        .filter((tx) => tx.type === "expense" && tx.categoryId === categoryId)
        .map((tx) => ({ amount: tx.amount, currency: tx.currency })),
    };
  },
});

/* ── Internal queries for the scheduled daily AI report (cron) ── */

/** All users who opted into the daily AI report and have Telegram configured. */
export const usersForDailyAiReport = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect();
    return rows
      .filter(
        (s) =>
          s.enableDailyAiReport === true &&
          s.enableTelegram === true &&
          !!s.telegramBotToken?.trim() &&
          !!s.telegramChatId?.trim(),
      )
      .map((s) => ({ userId: s.userId }));
  },
});

/**
 * Financial snapshot for a single user, used by the AI report action.
 * Returns today's figures plus the running month for context.
 */
export const aiReportDataForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const baseCurrency = settings?.baseCurrency ?? "AMD";
    const userName = settings?.userName ?? "";
    const monthStartDay = settings?.monthStartDay ?? 1;
    const token = await decryptSecret(settings?.telegramBotToken);
    const chatId = settings?.telegramChatId ?? "";

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const catName = new Map<Id<"categories">, string>(categories.map((c) => [c._id, c.name]));

    const today = pad(new Date());
    const monthStart = (() => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), monthStartDay);
      if (start > now) start.setMonth(start.getMonth() - 1);
      return pad(start);
    })();

    const monthTx = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", monthStart).lte("date", today),
      )
      .collect();

    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      userId,
      baseCurrency,
      userName,
      token,
      chatId,
      today,
      monthStart,
      transactions: monthTx.map((tx) => ({
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        categoryName: tx.categoryId ? (catName.get(tx.categoryId) ?? null) : null,
        date: tx.date,
        note: tx.note ?? null,
      })),
      budgets: budgets.map((b) => ({
        categoryName: catName.get(b.categoryId) ?? "",
        amount: b.amount,
      })),
      goals: goals.map((g) => ({
        name: g.name,
        target: g.target,
        saved: g.saved,
      })),
    };
  },
});

