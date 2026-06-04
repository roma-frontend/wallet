import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { buildSmsParsePrompt, type ParsedSms } from "@/lib/ai-advisor";
import { CURRENCY_CODES } from "@/lib/currencies";
import { checkRateLimitAsync } from "@/lib/ratelimit";

export const runtime = "nodejs";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

interface ParseBody {
  text: string;
  categories: { name: string; type: "income" | "expense" }[];
  today: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI ծառայությունը կարգավորված չէ" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const { allowed, reset } = await checkRateLimitAsync(`ai-parse-sms:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Չափից շատ հարցումներ" },
      { status: 429, headers: { "Retry-After": String(reset) } },
    );
  }

  try {
    const { text, categories, today } = (await req.json()) as ParseBody;
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Տեքստ չկա" }, { status: 400 });
    }

    const { text: out } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: buildSmsParsePrompt(text.slice(0, 600), {
        categories: Array.isArray(categories) ? categories.slice(0, 60) : [],
        today: today || new Date().toISOString().slice(0, 10),
      }),
    });

    let parsed: ParsedSms | null = null;
    try {
      const cleaned = out.replace(/```json|```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const json = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
      const raw = JSON.parse(json) as Partial<ParsedSms>;
      const currency =
        typeof raw.currency === "string" && (CURRENCY_CODES as readonly string[]).includes(raw.currency)
          ? raw.currency
          : null;
      parsed = {
        type: raw.type === "income" ? "income" : "expense",
        amount:
          typeof raw.amount === "number" && isFinite(raw.amount) && raw.amount > 0
            ? raw.amount
            : null,
        currency,
        categoryName: typeof raw.categoryName === "string" ? raw.categoryName : null,
        note: typeof raw.note === "string" && raw.note.trim() ? raw.note.trim() : null,
        date: typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null,
      };
    } catch {
      parsed = null;
    }

    if (!parsed || parsed.amount == null) {
      return NextResponse.json({ error: "Չհաջողվեց վերլուծել" }, { status: 422 });
    }

    return NextResponse.json({ parsed });
  } catch (error) {
    console.error("[ai-parse-sms]", error);
    return NextResponse.json({ error: "AI ծառայությունն անհասանելի է" }, { status: 500 });
  }
}
