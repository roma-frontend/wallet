import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { buildInsightsPrompt, type FinanceSnapshot } from "@/lib/ai-advisor";
import { checkRateLimitAsync } from "@/lib/ratelimit";

export const runtime = "nodejs";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

interface Insight {
  icon: string;
  title: string;
  text: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI ծառայությունը կարգավորված չէ" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const { allowed, reset } = await checkRateLimitAsync(`ai-insights:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Չափից շատ հարցումներ" },
      { status: 429, headers: { "Retry-After": String(reset) } },
    );
  }

  try {
    const { snapshot } = (await req.json()) as { snapshot: FinanceSnapshot };
    if (!snapshot) {
      return NextResponse.json({ error: "Տվյալներ չկան" }, { status: 400 });
    }

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: buildInsightsPrompt(snapshot),
    });

    let insights: Insight[] = [];
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      const json = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
      const parsed = JSON.parse(json) as Insight[];
      insights = parsed
        .filter((i) => i && typeof i.title === "string" && typeof i.text === "string")
        .slice(0, 4)
        .map((i) => ({ icon: i.icon || "💡", title: i.title, text: i.text }));
    } catch {
      insights = [];
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("[ai-insights]", error);
    return NextResponse.json({ error: "AI ծառայությունն անհասանելի է" }, { status: 500 });
  }
}
