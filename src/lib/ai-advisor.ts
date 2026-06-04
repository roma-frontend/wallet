/**
 * Financial AI advisor — prompt building & shared types.
 * Powers the chat assistant and the insights generator.
 * The model never sees secrets; only an aggregated, anonymised snapshot.
 */

export interface CategorySpend {
  name: string;
  amount: number;
  percent: number;
}

export interface BudgetStatus {
  name: string;
  limit: number;
  used: number;
}

export interface GoalStatus {
  name: string;
  target: number;
  saved: number;
}

/** Compact financial context passed to the model (already in base currency). */
export interface FinanceSnapshot {
  userName: string;
  currency: string;
  period: string;
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
  expenseTrend: number;
  topCategories: CategorySpend[];
  budgets: BudgetStatus[];
  goals: GoalStatus[];
  transactionCount: number;
}

function money(n: number, currency: string): string {
  const digits = currency === "AMD" || currency === "JPY" ? 0 : 2;
  return `${n.toLocaleString("hy-AM", { maximumFractionDigits: digits })} ${currency}`;
}

/** Render the snapshot as a readable block for the model. */
export function snapshotText(s: FinanceSnapshot): string {
  const cats = s.topCategories.length
    ? s.topCategories
        .map((c) => `  - ${c.name}: ${money(c.amount, s.currency)} (${c.percent.toFixed(0)}%)`)
        .join("\n")
    : "  (տվյալներ չկան)";
  const budgets = s.budgets.length
    ? s.budgets
        .map((b) => {
          const pct = b.limit > 0 ? ((b.used / b.limit) * 100).toFixed(0) : "0";
          return `  - ${b.name}: ${money(b.used, s.currency)} / ${money(b.limit, s.currency)} (${pct}%)`;
        })
        .join("\n")
    : "  (բյուջեներ չկան)";
  const goals = s.goals.length
    ? s.goals
        .map((g) => {
          const pct = g.target > 0 ? ((g.saved / g.target) * 100).toFixed(0) : "0";
          return `  - ${g.name}: ${money(g.saved, s.currency)} / ${money(g.target, s.currency)} (${pct}%)`;
        })
        .join("\n")
    : "  (նպատակներ չկան)";

  return [
    `Ժամանակահատված: ${s.period}`,
    `Եկամուտ: ${money(s.income, s.currency)}`,
    `Ծախս: ${money(s.expense, s.currency)}`,
    `Մնացորդ: ${money(s.balance, s.currency)}`,
    `Խնայողության տոկոս: ${s.savingsRate.toFixed(0)}%`,
    `Ծախսերի փոփոխություն նախորդ ամսվա համեմատ: ${s.expenseTrend > 0 ? "+" : ""}${s.expenseTrend.toFixed(0)}%`,
    `Գործարքների քանակ: ${s.transactionCount}`,
    ``,
    `Հիմնական ծախսային կատեգորիաները:`,
    cats,
    ``,
    `Բյուջեներ:`,
    budgets,
    ``,
    `Խնայողության նպատակներ:`,
    goals,
  ].join("\n");
}

/** System prompt for the conversational assistant. */
export function buildChatPrompt(s: FinanceSnapshot): string {
  return `Դու <b>Դրամ AI</b>-ն ես — «Դրամապանակ» անձնական ֆինանսների հավելվածի խելացի ֆինանսական խորհրդատուն։

ԲՆԱՎՈՐՈՒԹՅՈՒՆ:
- Բարյացակամ, պրոֆեսիոնալ և կոնկրետ
- ՄԻՇՏ պատասխանիր հայերենով
- Դիմիր օգտատիրոջը անունով, եթե հայտնի է (${s.userName || "օգտատեր"})
- Օգտագործիր էմոջիներ չափավոր՝ 💰📊💡✅⚠️
- Պատասխանները կարճ ու գործնական, մինչև 200 բառ
- Հիմնվիր ՄԻԱՅՆ ստորև բերված տվյալների վրա, մի՛ հորինիր թվեր

ՕԳՏԱՏԻՐՈՋ ԸՆԹԱՑԻԿ ՖԻՆԱՆՍԱԿԱՆ ՊԱՏԿԵՐԸ:
${snapshotText(s)}

ԿԱՐՈՂԱՆՈՒՄ ԵՍ:
- Վերլուծել ծախսերն ու եկամուտները
- Տալ խնայողության խորհուրդներ
- Բացատրել, թե որտեղ է գումարը գնում
- Առաջարկել բյուջեի օպտիմալացում
- Օգնել նպատակներին հասնելու պլանավորման հարցում
- Բացատրել հավելվածի գործառույթները (եկամուտներ, ծախսեր, բյուջե, նպատակներ, պարբերական վճարներ, արժույթի փոխարկիչ, վերլուծություն)

ԿԱՆՈՆՆԵՐ:
- Եթե տվյալները բավարար չեն, առաջարկիր ավելացնել գործարքներ
- Մի՛ տուր կոնկրետ ներդրումային խորհուրդներ, որոնք պահանջում են լիցենզիա
- Եղիր դրական և մոտիվացնող`;
}

/** System prompt for the one-shot insights generator. */
export function buildInsightsPrompt(s: FinanceSnapshot): string {
  return `Դու «Դրամապանակ» հավելվածի ֆինանսական վերլուծաբանն ես։ Վերլուծիր օգտատիրոջ տվյալները և տուր 3-4 կարճ, գործնական խորհուրդ հայերենով։

ՖԻՆԱՆՍԱԿԱՆ ՏՎՅԱԼՆԵՐ:
${snapshotText(s)}

ՊԱՀԱՆՋՆԵՐ:
- Վերադարձրու ՄԻԱՅՆ JSON զանգված՝ առանց markdown-ի, առանց լրացուցիչ տեքստի
- Ձևաչափ՝ [{"icon":"emoji","title":"կարճ վերնագիր","text":"1-2 նախադասություն խորհուրդ"}]
- 3-4 տարր
- icon-ը մեկ էմոջի է (օր.՝ 💡 ⚠️ 📈 🎯 💰)
- Հիմնվիր իրական թվերի վրա, նշիր կոնկրետ կատեգորիաներ ու գումարներ
- Եթե ծախսը գերազանցում է եկամուտը՝ զգուշացրու
- Եթե խնայողությունը լավ է՝ գովիր
- Պատասխանը պետք է լինի վավեր JSON`;
}

export const CHAT_SUGGESTIONS = [
  "Ինչպե՞ս կարող եմ ավելի շատ խնայել",
  "Ո՞ր կատեգորիայում եմ շատ ծախսում",
  "Վերլուծիր իմ այս ամսվա ծախսերը",
  "Ինչպե՞ս հասնեմ իմ նպատակին ավելի արագ",
];

/* ── Natural-language transaction parsing ── */

export interface ParsedTransaction {
  type: "income" | "expense";
  amount: number | null;
  categoryName: string | null;
  note: string | null;
  /** ISO date yyyy-MM-dd, or null when the user gave no date. */
  date: string | null;
}

/**
 * Prompt that turns a free-form phrase ("սուրճ 1500 երեկ") into a structured
 * transaction. The model only ever returns JSON.
 */
export function buildParsePrompt(
  text: string,
  opts: { categories: { name: string; type: "income" | "expense" }[]; today: string },
): string {
  const catList = opts.categories.length
    ? opts.categories.map((c) => `  - ${c.name} (${c.type === "income" ? "եկամուտ" : "ծախս"})`).join("\n")
    : "  (կատեգորիաներ չկան)";

  return `Դու ֆինանսական գործարքների վերլուծիչ ես «Դրամապանակ» հավելվածի համար։
Օգտատերը գրում է գործարք բնական լեզվով (հիմնականում հայերեն, երբեմն ռուսերեն կամ անգլերեն)։ Վերածիր այն կառուցվածքային JSON-ի։

ԱՅՍՕՐ՝ ${opts.today}

ՀԱՍԱՆԵԼԻ ԿԱՏԵԳՈՐԻԱՆԵՐ:
${catList}

ԿԱՆՈՆՆԵՐ:
- Վերադարձրու ՄԻԱՅՆ վավեր JSON՝ առանց markdown-ի, առանց բացատրության
- Ձևաչափ՝ {"type":"expense|income","amount":number|null,"categoryName":"ստույգ կատեգորիայի անուն ցուցակից կամ null","note":"կարճ նշում կամ null","date":"YYYY-MM-DD կամ null"}
- type՝ լռելյայն "expense", բացի եթե ակնհայտ եկամուտ է (աշխատավարձ, բոնուս, ստացա, վճարեցին ինձ)
- amount՝ հանիր թիվը (օր.՝ «1500», «1.5к»→1500, «2 հազար»→2000)
- categoryName՝ ընտրիր ՄԻԱՅՆ ցուցակից ամենահարմարը՝ ըստ իմաստի (սուրճ/ճաշ→սնունդ, տաքսի→տրանսպորտ)։ Եթե ոչ մի կատեգորիա չի համապատասխանում՝ null
- date՝ «այսօր»→${opts.today}, «երեկ»→նախորդ օրը, «առաջիկա» օրեր հաշվիր ${opts.today}-ից։ Եթե ամսաթիվ նշված չէ՝ null
- note՝ բնագրի համառոտ նկարագրությունը (առանց գումարի ու ամսաթվի), կամ null

ՕԳՏԱՏԻՐՈՋ ՏԵՔՍՏԸ:
"""${text}"""`;
}

/* ── Bank SMS / notification parsing ── */

export interface ParsedSms {
  type: "income" | "expense";
  amount: number | null;
  currency: string | null;
  categoryName: string | null;
  /** Merchant / counterparty name, used as the note. */
  note: string | null;
  date: string | null;
}

/**
 * Prompt that extracts a transaction from a raw bank SMS or push notification.
 * Armenian banks (Ameriabank, Inecobank, ACBA, etc.) send messages in Armenian,
 * Russian or English; the model normalises them into JSON.
 */
export function buildSmsParsePrompt(
  text: string,
  opts: {
    categories: { name: string; type: "income" | "expense" }[];
    today: string;
  },
): string {
  const catList = opts.categories.length
    ? opts.categories.map((c) => `  - ${c.name} (${c.type === "income" ? "եկամուտ" : "ծախս"})`).join("\n")
    : "  (կատեգորիաներ չկան)";

  return `Դու բանկային SMS-երի և push-ծանուցումների վերլուծիչ ես «Դրամապանակ» հավելվածի համար։
Հայկական բանկերը (Ameriabank, Inecobank, ACBA, Converse, Evocabank) ուղարկում են գործարքի ծանուցումներ հայերեն, ռուսերեն կամ անգլերեն։ Հանիր գործարքի տվյալները և վերադարձրու JSON։

ԱՅՍՕՐ՝ ${opts.today}

ՀԱՍԱՆԵԼԻ ԿԱՏԵԳՈՐԻԱՆԵՐ:
${catList}

ԿԱՆՈՆՆԵՐ:
- Վերադարձրու ՄԻԱՅՆ վավեր JSON՝ առանց markdown-ի, առանց բացատրության
- Ձևաչափ՝ {"type":"expense|income","amount":number|null,"currency":"AMD|USD|EUR|RUB|GBP|GEL|CHF|JPY|CNY|TRY|null","categoryName":"անուն ցուցակից կամ null","note":"վաճառակետի/գործընկերոջ անունը կամ null","date":"YYYY-MM-DD կամ null"}
- type՝ «գանձում», «դուրսգրում», «վճարում», «покупка», «списание», «debit»→expense; «մուտք», «համալրում», «зачисление», «credit»→income
- amount՝ հանիր գումարը (օր.՝ «12,500.00 AMD»→12500)
- currency՝ ճանաչիր արժույթը (AMD/դրամ/֏, USD/$, EUR/€, RUB/₽)։ Եթե հստակ չէ՝ "AMD"
- categoryName՝ ընտրիր ՄԻԱՅՆ ցուցակից՝ ըստ վաճառակետի (supermarket/store→սնունդ, fuel/gas→տրանսպորտ)։ Եթե անհայտ է՝ null
- note՝ վաճառակետի անունը (օր.՝ «SAS SUPERMARKET», «YANDEX GO»), կամ null
- date՝ եթե SMS-ում կա ամսաթիվ՝ օգտագործիր այն (YYYY-MM-DD), հակառակ դեպքում ${opts.today}

SMS ՏԵՔՍՏԸ:
"""${text}"""`;
}

