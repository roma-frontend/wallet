import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireUser } from "./helpers";
import { DEFAULT_CATEGORIES } from "./defaults";
import { encryptSecret, decryptSecret } from "./crypto";

/** Current signed-in user's profile + settings (null when signed out). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      id: userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      settings: settings
        ? {
            baseCurrency: settings.baseCurrency,
            userName: settings.userName,
            monthStartDay: settings.monthStartDay,
            enableAiChat: settings.enableAiChat ?? false,
            enableAiInsights: settings.enableAiInsights ?? false,
            enableTelegram: settings.enableTelegram ?? false,
            // The bot token is a secret: never returned to the client. We only
            // expose whether one is configured so the UI can show its state.
            hasTelegramToken: !!settings.telegramBotToken,
            telegramChatId: settings.telegramChatId ?? "",
            reportSchedule: settings.reportSchedule ?? "off",
            enableDailyAiReport: settings.enableDailyAiReport ?? false,
            enableBudgetAlerts: settings.enableBudgetAlerts ?? false,
            enableTxNotifications: settings.enableTxNotifications ?? false,
            onboarded: settings.onboarded ?? false,
          }
        : null,
    };
  },
});

export const update = mutation({
  args: {
    baseCurrency: v.optional(v.string()),
    userName: v.optional(v.string()),
    monthStartDay: v.optional(v.number()),
    enableAiChat: v.optional(v.boolean()),
    enableAiInsights: v.optional(v.boolean()),
    enableTelegram: v.optional(v.boolean()),
    telegramBotToken: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    reportSchedule: v.optional(
      v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    ),
    enableDailyAiReport: v.optional(v.boolean()),
    enableBudgetAlerts: v.optional(v.boolean()),
    enableTxNotifications: v.optional(v.boolean()),
    onboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, patch) => {
    const userId = await requireUser(ctx);
    // Encrypt the Telegram bot token at rest when present.
    const data = { ...patch };
    if (typeof data.telegramBotToken === "string") {
      data.telegramBotToken = data.telegramBotToken
        ? await encryptSecret(data.telegramBotToken)
        : "";
    }
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }
    return await ctx.db.insert("settings", {
      userId,
      baseCurrency: data.baseCurrency ?? "AMD",
      userName: data.userName ?? "",
      monthStartDay: data.monthStartDay ?? 1,
    });
  },
});

/**
 * Decrypted Telegram credentials for a user. Internal-only — never callable
 * from the client, used by notification actions / the daily report cron.
 */
export const telegramConfig = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return {
      token: await decryptSecret(settings?.telegramBotToken),
      chatId: settings?.telegramChatId ?? "",
      enableTelegram: settings?.enableTelegram ?? false,
      enableBudgetAlerts: settings?.enableBudgetAlerts ?? false,
      enableTxNotifications: settings?.enableTxNotifications ?? false,
    };
  },
});

/**
 * Seed default categories + settings for a freshly-registered user.
 * Idempotent: does nothing if the user already has settings.
 */
export const bootstrap = mutation({
  args: { userName: v.optional(v.string()) },
  handler: async (ctx, { userName }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) return;

    await ctx.db.insert("settings", {
      userId,
      baseCurrency: "AMD",
      userName: userName ?? "",
      monthStartDay: 1,
    });

    // A starter cash account so balances & net worth work out of the box.
    await ctx.db.insert("accounts", {
      userId,
      name: "Կանխիկ",
      type: "cash",
      currency: "AMD",
      initialBalance: 0,
      icon: "banknote",
      color: "#10b981",
      order: 0,
    });

    for (const cat of DEFAULT_CATEGORIES) {
      await ctx.db.insert("categories", {
        userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isDefault: true,
      });
    }
  },
});

/** Full snapshot of the user's data for JSON backup. */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const [categories, transactions, budgets, goals, recurring, accounts, transfers, settings] =
      await Promise.all([
        ctx.db.query("categories").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("budgets").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("goals").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("recurring").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("accounts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("transfers").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("settings").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
      ]);

    return {
      version: 2,
      exportedAt: Date.now(),
      categories,
      transactions,
      budgets,
      goals,
      recurring,
      accounts,
      transfers,
      settings,
    };
  },
});

/** Delete all of the user's financial data (keeps account + settings). */
export const clearData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    for (const table of ["transactions", "transfers", "budgets", "goals", "recurring", "accounts", "categories"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
  },
});

type ImportCategory = { name: string; icon: string; color: string; type: "income" | "expense"; isDefault?: boolean };
type ImportTransaction = {
  type: "income" | "expense";
  amount: number;
  currency: string;
  categoryName?: string;
  note?: string;
  date: string;
  recurrence: "none" | "weekly" | "monthly" | "yearly";
};

/** Replace the user's data from a backup payload. Maps categories by name. */
export const importData = mutation({
  args: {
    categories: v.array(
      v.object({
        name: v.string(),
        icon: v.string(),
        color: v.string(),
        type: v.union(v.literal("income"), v.literal("expense")),
        isDefault: v.optional(v.boolean()),
      }),
    ),
    transactions: v.array(
      v.object({
        type: v.union(v.literal("income"), v.literal("expense")),
        amount: v.number(),
        currency: v.string(),
        categoryName: v.optional(v.string()),
        note: v.optional(v.string()),
        date: v.string(),
        recurrence: v.union(
          v.literal("none"),
          v.literal("weekly"),
          v.literal("monthly"),
          v.literal("yearly"),
        ),
      }),
    ),
  },
  handler: async (ctx, { categories, transactions }) => {
    const userId = await requireUser(ctx);

    // Safety guard: never wipe existing data for an empty / invalid payload.
    if (categories.length === 0 && transactions.length === 0) {
      throw new Error("Ֆայլը դատարկ է կամ վավեր չէ");
    }

    // Wipe existing financial data.
    for (const table of ["transactions", "budgets", "goals", "recurring", "categories"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }

    const nameToId = new Map<string, import("./_generated/dataModel").Id<"categories">>();
    for (const cat of categories as ImportCategory[]) {
      const id = await ctx.db.insert("categories", {
        userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        isDefault: cat.isDefault ?? false,
      });
      nameToId.set(cat.name, id);
    }

    for (const tx of transactions as ImportTransaction[]) {
      await ctx.db.insert("transactions", {
        userId,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        categoryId: tx.categoryName ? nameToId.get(tx.categoryName) : undefined,
        note: tx.note,
        date: tx.date,
        recurrence: tx.recurrence,
      });
    }
  },
});
