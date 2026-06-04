import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/* ── currency helpers (live rates, server-side) ── */

const FALLBACK: Record<string, number> = {
  AMD: 1, USD: 0.0026, EUR: 0.0024, RUB: 0.2, GBP: 0.002,
  GEL: 0.007, CHF: 0.0023, JPY: 0.38, CNY: 0.018, TRY: 0.084,
};

async function getRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, { cache: "no-store" });
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (data.result === "success" && data.rates) return data.rates;
  } catch {
    /* fall through to offline rates */
  }
  // Convert AMD-relative fallback into `base`-relative.
  const out: Record<string, number> = {};
  const baseToAmd = base === "AMD" ? 1 : 1 / (FALLBACK[base] ?? 1);
  for (const [code, perAmd] of Object.entries(FALLBACK)) {
    out[code] = perAmd * baseToAmd;
  }
  return out;
}

function toBase(amount: number, currency: string, base: string, rates: Record<string, number>) {
  if (currency === base) return amount;
  const rate = rates[currency];
  if (!rate) return amount;
  return amount / rate;
}

function fmt(n: number, currency: string): string {
  const digits = currency === "AMD" || currency === "JPY" ? 0 : 2;
  return n.toLocaleString("hy-AM", { maximumFractionDigits: digits });
}

const SYMBOL: Record<string, string> = {
  AMD: "֏", USD: "$", EUR: "€", RUB: "₽", GBP: "£",
  GEL: "₾", CHF: "₣", JPY: "¥", CNY: "¥", TRY: "₺",
};

async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || `Telegram error (HTTP ${res.status})`);
  }
  return true;
}

/* ── public actions ── */

/** Send a test message to validate Telegram configuration. */
export const sendTest = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean }> => {
    const me = await ctx.runQuery(api.settings.me);
    if (!me) throw new Error("Չհաստատված օգտատեր");
    const { token, chatId } = await ctx.runQuery(internal.settings.telegramConfig, {
      userId: me.id as Id<"users">,
    });
    if (!token || !chatId) throw new Error("Telegram-ի կարգավորումները լրացված չեն");

    const text = [
      `<b>✅ Դրամապանակ — Թեստային հաղորդագրություն</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>Բոտը աշխատում է՝</b> ✅`,
      `<b>🕐 Ժամը՝</b> ${new Date().toLocaleString("hy-AM", { timeZone: "Asia/Yerevan" })}`,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `<i>Այսուհետ ձեր ֆինանսական ծանուցումները կստանաք այստեղ</i> 💰`,
    ].join("\n");

    await sendTelegram(token, chatId, text);
    return { ok: true };
  },
});

/** Build & send a spending/income report for the given period. */
export const sendReport = action({
  args: {
    period: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
  },
  handler: async (ctx, { period }): Promise<{ ok: boolean }> => {
    const me = await ctx.runQuery(api.settings.me);
    if (!me) throw new Error("Չհաստատված օգտատեր");
    const { token, chatId } = await ctx.runQuery(internal.settings.telegramConfig, {
      userId: me.id as Id<"users">,
    });
    if (!token || !chatId) throw new Error("Telegram-ի կարգավորումները լրացված չեն");

    const data = await ctx.runQuery(api.reports.periodData, { period });
    const base = data.baseCurrency;
    const sym = SYMBOL[base] ?? base;
    const rates = await getRates(base);

    let income = 0;
    let expense = 0;
    const byCat = new Map<string, number>();
    for (const tx of data.transactions) {
      const val = toBase(tx.amount, tx.currency, base, rates);
      if (tx.type === "income") income += val;
      else {
        expense += val;
        const key = tx.categoryName ?? "Այլ";
        byCat.set(key, (byCat.get(key) ?? 0) + val);
      }
    }
    const balance = income - expense;
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const periodLabel =
      period === "daily" ? "Օրվա" : period === "weekly" ? "Շաբաթվա" : "Ամսվա";

    const lines = [
      `<b>📊 ${periodLabel} ֆինանսական հաշվետվություն</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>💚 Եկամուտ՝</b> ${fmt(income, base)} ${sym}`,
      `<b>💸 Ծախս՝</b> ${fmt(expense, base)} ${sym}`,
      `<b>💰 Մնացորդ՝</b> <b>${fmt(balance, base)} ${sym}</b>`,
    ];

    if (income > 0) {
      const rate = ((income - expense) / income) * 100;
      lines.push(`<b>📈 Խնայողություն՝</b> ${rate.toFixed(0)}%`);
    }

    if (topCats.length) {
      lines.push(``, `━━ <b>Հիմնական ծախսերը</b> ━━`);
      const medals = ["🥇", "🥈", "🥉", "▫️", "▫️"];
      topCats.forEach(([name, amount], i) => {
        lines.push(`${medals[i]} ${name}՝ ${fmt(amount, base)} ${sym}`);
      });
    }

    lines.push(
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `<i>${data.from} — ${data.to}</i>`,
    );

    await sendTelegram(token, chatId, lines.join("\n"));
    return { ok: true };
  },
});

/** Send Telegram alerts for any budgets exceeded this month. */
export const sendBudgetAlert = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; alerted: number }> => {
    const me = await ctx.runQuery(api.settings.me);
    if (!me) throw new Error("Չհաստատված օգտատեր");
    const { token, chatId } = await ctx.runQuery(internal.settings.telegramConfig, {
      userId: me.id as Id<"users">,
    });
    if (!token || !chatId) throw new Error("Telegram-ի կարգավորումները լրացված չեն");

    const data = await ctx.runQuery(api.reports.periodData, { period: "monthly" });
    const base = data.baseCurrency;
    const sym = SYMBOL[base] ?? base;
    const rates = await getRates(base);

    const spent = new Map<string, number>();
    for (const tx of data.transactions) {
      if (tx.type !== "expense" || !tx.categoryName) continue;
      const val = toBase(tx.amount, tx.currency, base, rates);
      spent.set(tx.categoryName, (spent.get(tx.categoryName) ?? 0) + val);
    }

    const exceeded = data.budgets
      .map((b) => ({ name: b.categoryName, limit: b.amount, used: spent.get(b.categoryName) ?? 0 }))
      .filter((b) => b.limit > 0 && b.used > b.limit);

    if (!exceeded.length) return { ok: true, alerted: 0 };

    const lines = [
      `<b>⚠️ Բյուջեի գերազանցում</b>`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
    ];
    for (const b of exceeded) {
      const pct = ((b.used / b.limit) * 100).toFixed(0);
      lines.push(
        `<b>${b.name}</b>`,
        `   Սահման՝ ${fmt(b.limit, base)} ${sym}`,
        `   Ծախսված՝ <b>${fmt(b.used, base)} ${sym}</b> (${pct}%)`,
        ``,
      );
    }
    lines.push(`━━━━━━━━━━━━━━━━━━`, `<i>Վերանայեք ձեր ծախսերը</i> 💡`);

    await sendTelegram(token, chatId, lines.join("\n"));
    return { ok: true, alerted: exceeded.length };
  },
});

/* ── Daily AI financial report (cron @ 19:00 Yerevan) ── */

type ReportData = {
  userId: Id<"users">;
  baseCurrency: string;
  userName: string;
  token: string;
  chatId: string;
  today: string;
  monthStart: string;
  transactions: {
    type: "income" | "expense";
    amount: number;
    currency: string;
    categoryName: string | null;
    date: string;
    note: string | null;
  }[];
  budgets: { categoryName: string; amount: number }[];
  goals: { name: string; target: number; saved: number }[];
};

/** Call Groq (OpenAI-compatible) for the Armenian advice text. */
async function generateAdvice(prompt: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Build the Telegram message (numbers + AI advice) for one user and send it. */
async function buildAndSendDailyReport(data: ReportData): Promise<boolean> {
  const { token, chatId } = data;
  if (!token || !chatId) return false;

  const base = data.baseCurrency;
  const sym = SYMBOL[base] ?? base;
  const rates = await getRates(base);

  // Aggregate today + this month (in base currency).
  let todayExpense = 0;
  let todayIncome = 0;
  let monthExpense = 0;
  let monthIncome = 0;
  const todayByCat = new Map<string, number>();
  const monthByCat = new Map<string, number>();

  for (const tx of data.transactions) {
    const val = toBase(tx.amount, tx.currency, base, rates);
    const isToday = tx.date === data.today;
    if (tx.type === "income") {
      monthIncome += val;
      if (isToday) todayIncome += val;
    } else {
      monthExpense += val;
      const key = tx.categoryName ?? "Այլ";
      monthByCat.set(key, (monthByCat.get(key) ?? 0) + val);
      if (isToday) {
        todayExpense += val;
        todayByCat.set(key, (todayByCat.get(key) ?? 0) + val);
      }
    }
  }

  const monthTop = [...monthByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const todayTop = [...todayByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;

  // Build the snapshot the model reasons over.
  const snapshotText = [
    `Օգտատեր: ${data.userName || "—"}`,
    `Արժույթ: ${base}`,
    ``,
    `ԱՅՍՕՐ (${data.today}):`,
    `  Ծախս: ${fmt(todayExpense, base)} ${sym}`,
    `  Եկամուտ: ${fmt(todayIncome, base)} ${sym}`,
    todayTop.length
      ? `  Այսօրվա ծախսերը ըստ կատեգորիայի:\n` +
        todayTop.map((c) => `    - ${c[0]}: ${fmt(c[1], base)} ${sym}`).join("\n")
      : `  Այսօր ծախսեր չկան`,
    ``,
    `ԱՅՍ ԱՄԻՍ (${data.monthStart}-ից):`,
    `  Ընդհանուր ծախս: ${fmt(monthExpense, base)} ${sym}`,
    `  Ընդհանուր եկամուտ: ${fmt(monthIncome, base)} ${sym}`,
    `  Խնայողության տոկոս: ${savingsRate.toFixed(0)}%`,
    monthTop.length
      ? `  Ամսվա հիմնական ծախսերը:\n` +
        monthTop.map((c) => `    - ${c[0]}: ${fmt(c[1], base)} ${sym}`).join("\n")
      : `  Ծախսեր չկան`,
    ``,
    data.budgets.length
      ? `Բյուջեներ:\n` +
        data.budgets
          .map((b) => {
            const used = monthByCat.get(b.categoryName) ?? 0;
            const pct = b.amount > 0 ? ((used / b.amount) * 100).toFixed(0) : "0";
            return `  - ${b.categoryName}: ${fmt(used, base)} / ${fmt(b.amount, base)} ${sym} (${pct}%)`;
          })
          .join("\n")
      : `Բյուջեներ չկան`,
    data.goals.length
      ? `Խնայողության նպատակներ:\n` +
        data.goals
          .map((g) => {
            const pct = g.target > 0 ? ((g.saved / g.target) * 100).toFixed(0) : "0";
            return `  - ${g.name}: ${fmt(g.saved, base)} / ${fmt(g.target, base)} ${sym} (${pct}%)`;
          })
          .join("\n")
      : `Նպատակներ չկան`,
  ].join("\n");

  const prompt = `Դու «Դրամապանակ» հավելվածի անձնական ֆինանսական խորհրդատուն ես՝ Դրամ AI-ն։
Գրիր օգտատիրոջ ամենօրյա ֆինանսական խորհրդատվությունը ՀԱՅԵՐԵՆՈՎ՝ հիմնվելով ստորև բերված տվյալների վրա։

ՊԱՀԱՆՋՆԵՐ:
- Միայն հայերեն, ջերմ ու մոտիվացնող, բայց կոնկրետ տոնով
- Դիմիր օգտատիրոջը անունով, եթե հայտնի է (${data.userName || "օգտատեր"})
- 3-5 կարճ, գործնական խորհուրդ՝ թե որտեղ է գումարը գնում, ինչպես խնայել, ինչ ուղղել
- Եթե այսօր կամ այս ամիս շատ է ծախսել որևէ կատեգորիայում՝ մատնանշիր կոնկրետ
- Եթե խնայողության տոկոսը ցածր է, առաջարկիր բարելավման քայլեր
- Հիշեցրու դրական սովորություններ՝ բյուջե, նպատակներ, պլանավորում
- Օգտագործիր էմոջիներ չափավոր (💡 💰 📊 ⚠️ ✅ 🎯)
- ՄԻ՛ հորինիր թվեր, օգտագործիր միայն տրված տվյալները
- Առավելագույնը 180 բառ
- Կարող ես օգտագործել HTML <b> պիտակներ կարևոր կետերի համար (ոչ markdown)

ՖԻՆԱՆՍԱԿԱՆ ՏՎՅԱԼՆԵՐ:
${snapshotText}`;

  const advice = await generateAdvice(prompt);

  const header = [
    `<b>🧠 Օրվա ֆինանսական խորհուրդ</b>`,
    ``,
    `━━━━━━━━━━━━━━━━━━`,
    `<b>📅 ${data.today}</b>`,
    `<b>💸 Այսօրվա ծախս՝</b> ${fmt(todayExpense, base)} ${sym}`,
    `<b>💚 Այսօրվա եկամուտ՝</b> ${fmt(todayIncome, base)} ${sym}`,
    `<b>📊 Ամսվա ծախս՝</b> ${fmt(monthExpense, base)} ${sym}`,
    `<b>📈 Խնայողություն՝</b> ${savingsRate.toFixed(0)}%`,
    `━━━━━━━━━━━━━━━━━━`,
  ];

  const body = advice
    ? ["", advice]
    : ["", `<i>AI խորհուրդն այս պահին հասանելի չէ, բայց ձեր այսօրվա ցուցանիշները վերևում են։</i> 💡`];

  await sendTelegram(token, chatId, [...header, ...body].join("\n"));
  return true;
}

/** Cron entry point: send the daily AI report to every opted-in user. */
export const runDailyAiReports = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number }> => {
    const users = await ctx.runQuery(internal.reports.usersForDailyAiReport);
    let sent = 0;
    for (const { userId } of users) {
      try {
        const data = await ctx.runQuery(internal.reports.aiReportDataForUser, { userId });
        const ok = await buildAndSendDailyReport(data as ReportData);
        if (ok) sent++;
      } catch (err) {
        console.error("[daily-ai-report]", userId, err);
      }
    }
    return { sent };
  },
});

/**
 * Fired (scheduled) right after a transaction is added. Sends an optional
 * "new transaction" Telegram message and, for expenses with a category, a
 * budget-exceeded alert — but only for the toggles the user enabled.
 */
export const notifyTransactionAdded = internalAction({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    currency: v.string(),
    categoryId: v.optional(v.id("categories")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const cfg = await ctx.runQuery(internal.settings.telegramConfig, { userId: args.userId });
    if (!cfg.enableTelegram || !cfg.token || !cfg.chatId) return;

    // 1) New-transaction notification.
    if (cfg.enableTxNotifications) {
      const sym = SYMBOL[args.currency] ?? args.currency;
      const emoji = args.type === "income" ? "💚" : "💸";
      const label = args.type === "income" ? "Նոր եկամուտ" : "Նոր ծախս";
      const lines = [
        `<b>${emoji} ${label}</b>`,
        ``,
        `<b>Գումար՝</b> ${fmt(args.amount, args.currency)} ${sym}`,
      ];
      if (args.note) lines.push(`<b>Նշում՝</b> ${args.note}`);
      try {
        await sendTelegram(cfg.token, cfg.chatId, lines.join("\n"));
      } catch (err) {
        console.error("[tx-notify]", err);
      }
    }

    // 2) Budget-exceeded alert for this category.
    if (cfg.enableBudgetAlerts && args.type === "expense" && args.categoryId) {
      try {
        const data = await ctx.runQuery(internal.reports.monthBudgetDataForUser, {
          userId: args.userId,
          categoryId: args.categoryId,
        });
        if (data.budgetAmount > 0) {
          const base = data.baseCurrency;
          const sym = SYMBOL[base] ?? base;
          const rates = await getRates(base);
          let used = 0;
          for (const tx of data.transactions) used += toBase(tx.amount, tx.currency, base, rates);
          if (used > data.budgetAmount) {
            const pct = ((used / data.budgetAmount) * 100).toFixed(0);
            const lines = [
              `<b>⚠️ Բյուջեի գերազանցում</b>`,
              ``,
              `<b>${data.categoryName}</b>`,
              `   Սահման՝ ${fmt(data.budgetAmount, base)} ${sym}`,
              `   Ծախսված՝ <b>${fmt(used, base)} ${sym}</b> (${pct}%)`,
              ``,
              `<i>Վերանայեք ձեր ծախսերը</i> 💡`,
            ];
            await sendTelegram(cfg.token, cfg.chatId, lines.join("\n"));
          }
        }
      } catch (err) {
        console.error("[budget-alert]", err);
      }
    }
  },
});

/** Manual trigger for the signed-in user (used by the "send now" button). */
export const sendDailyAiReportNow = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean }> => {
    const me = await ctx.runQuery(api.settings.me);
    if (!me) throw new Error("Չհաստատված օգտատեր");

    const data = await ctx.runQuery(internal.reports.aiReportDataForUser, {
      userId: me.id as Id<"users">,
    });
    if (!data.token || !data.chatId) throw new Error("Telegram-ի կարգավորումները լրացված չեն");
    await buildAndSendDailyReport(data as ReportData);
    return { ok: true };
  },
});

