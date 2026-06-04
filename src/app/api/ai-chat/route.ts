import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { buildChatPrompt, type FinanceSnapshot } from "@/lib/ai-advisor";
import { checkRateLimitAsync } from "@/lib/ratelimit";

export const runtime = "nodejs";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI ծառայությունը կարգավորված չէ" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const { allowed, reset } = await checkRateLimitAsync(`ai-chat:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Չափից շատ հարցումներ։ Փորձեք քիչ անց։" },
      { status: 429, headers: { "Retry-After": String(reset) } },
    );
  }

  try {
    const { message, snapshot, history } = (await req.json()) as {
      message: string;
      snapshot: FinanceSnapshot;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    if (typeof message !== "string" || !message.trim() || message.length > 2000) {
      return NextResponse.json({ error: "Անվավեր հաղորդագրություն" }, { status: 400 });
    }
    if (!snapshot) {
      return NextResponse.json({ error: "Տվյալներ չկան" }, { status: 400 });
    }

    const messages = [
      ...(history || []).slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: message.trim() },
    ];

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: buildChatPrompt(snapshot),
      messages,
    });

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("[ai-chat]", error);
    return NextResponse.json({ error: "AI ծառայությունն անհասանելի է" }, { status: 500 });
  }
}
