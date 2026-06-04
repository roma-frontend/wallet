import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Դրամապանակ — Convex schema.
 * All financial data is scoped per-user via the `userId` field and
 * the `by_user*` indexes, so each account only ever sees its own data.
 */

export const transactionType = v.union(v.literal("income"), v.literal("expense"));
export const recurrence = v.union(
  v.literal("none"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
);
export const accountType = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("savings"),
  v.literal("credit"),
  v.literal("other"),
);

export default defineSchema({
  // Convex Auth tables (users, accounts, sessions, …)
  ...authTables,

  /**
   * Money containers (cash, bank cards, savings, credit lines…).
   * Net worth = Σ of every account's running balance, expressed in base currency.
   */
  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: accountType,
    /** The account's own currency (transactions in it are converted for balance). */
    currency: v.string(),
    /** Opening balance in the account's own currency. */
    initialBalance: v.number(),
    icon: v.string(),
    color: v.string(),
    /** Hidden from totals but kept for history. */
    archived: v.optional(v.boolean()),
    /** Display order. */
    order: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  /** Money moved between two of the user's own accounts (net-worth neutral). */
  transfers: defineTable({
    userId: v.id("users"),
    fromAccountId: v.id("accounts"),
    toAccountId: v.id("accounts"),
    /** Amount leaving the source account, in the source account's currency. */
    amount: v.number(),
    currency: v.string(),
    /** ISO date string yyyy-MM-dd */
    date: v.string(),
    note: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    type: transactionType,
    isDefault: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: transactionType,
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("categories")),
    /** Account this transaction belongs to (optional for legacy rows). */
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    /** ISO date string yyyy-MM-dd */
    date: v.string(),
    recurrence,
    /** Free-form labels for richer filtering/analytics. */
    tags: v.optional(v.array(v.string())),
    /** Split a single payment across multiple categories (amounts in tx currency). */
    splits: v.optional(
      v.array(
        v.object({
          categoryId: v.optional(v.id("categories")),
          amount: v.number(),
          note: v.optional(v.string()),
        }),
      ),
    ),
    /** Attached receipt photo (Convex File Storage id). */
    receiptId: v.optional(v.id("_storage")),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_user_type", ["userId", "type"]),

  budgets: defineTable({
    userId: v.id("users"),
    categoryId: v.id("categories"),
    /** Monthly limit in the user's base currency */
    amount: v.number(),
    /** Carry unused (or overspent) amount into the next month. */
    rollover: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "categoryId"]),

  goals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.string(),
    color: v.string(),
    /** Target amount in base currency */
    target: v.number(),
    /** Amount already saved */
    saved: v.number(),
    /** Optional ISO deadline yyyy-MM-dd */
    deadline: v.optional(v.string()),
    /** When linked, saved is mirrored from this account's live balance. */
    accountId: v.optional(v.id("accounts")),
  }).index("by_user", ["userId"]),

  /**
   * Debts & loans the user owes (borrowed) or is owed (lent). Progress is
   * tracked by logging payments that reduce the outstanding balance.
   */
  debts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    /** "owe" = money the user must repay; "lent" = money owed to the user. */
    kind: v.union(v.literal("owe"), v.literal("lent")),
    /** Original principal in base currency. */
    principal: v.number(),
    /** Amount already paid off / collected, in base currency. */
    paid: v.number(),
    currency: v.string(),
    /** Optional counterparty (bank, person…). */
    counterparty: v.optional(v.string()),
    /** Optional ISO due date yyyy-MM-dd. */
    dueDate: v.optional(v.string()),
    note: v.optional(v.string()),
    icon: v.string(),
    color: v.string(),
    archived: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  recurring: defineTable({
    userId: v.id("users"),
    type: transactionType,
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("categories")),
    note: v.optional(v.string()),
    /** How often it repeats */
    interval: v.union(v.literal("weekly"), v.literal("monthly"), v.literal("yearly")),
    /** Day of month (1-31) or weekday (0-6) the charge happens */
    dayOfMonth: v.number(),
    /** ISO date of next occurrence */
    nextDate: v.string(),
    active: v.boolean(),
  }).index("by_user", ["userId"]),

  settings: defineTable({
    userId: v.id("users"),
    baseCurrency: v.string(),
    userName: v.string(),
    /** Day of month a financial period starts (1-28) */
    monthStartDay: v.number(),

    /* ── Smart features (all optional, off by default) ── */
    /** AI financial assistant chat */
    enableAiChat: v.optional(v.boolean()),
    /** AI-generated insights & tips on analytics */
    enableAiInsights: v.optional(v.boolean()),
    /** Master switch for Telegram notifications */
    enableTelegram: v.optional(v.boolean()),
    /** Telegram bot token (BotFather) */
    telegramBotToken: v.optional(v.string()),
    /** Telegram chat id to send messages to */
    telegramChatId: v.optional(v.string()),
    /** Send a spending summary on this cadence */
    reportSchedule: v.optional(
      v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    ),
    /** Daily AI-written financial report + advice at 19:00 Yerevan */
    enableDailyAiReport: v.optional(v.boolean()),
    /** Notify in Telegram when a budget is exceeded */
    enableBudgetAlerts: v.optional(v.boolean()),
    /** Notify in Telegram on every new transaction */
    enableTxNotifications: v.optional(v.boolean()),
    /** Whether the user finished the first-run onboarding wizard. */
    onboarded: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  /**
   * Fixed-window rate-limit counters (keyed by route+IP). Persistent across
   * serverless cold starts, unlike the in-memory fallback.
   */
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    /** Epoch ms when the current window started. */
    windowStart: v.number(),
  }).index("by_key", ["key"]),
});
