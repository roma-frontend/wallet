"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { CHAT_SUGGESTIONS } from "@/lib/ai-advisor";
import { useMe } from "@/hooks/use-data";
import { useFinanceSnapshot } from "@/hooks/use-finance";
import { useAiStore } from "@/store/use-ai-store";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function AiAssistant() {
  const me = useMe();
  const enabled = me?.settings?.enableAiChat ?? false;

  const open = useAiStore((s) => s.open);
  const setOpen = useAiStore((s) => s.setOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const snapshot = useFinanceSnapshot();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  if (!enabled) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: message }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          snapshot,
          history: messages.slice(-6),
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? data.error ?? t.ai.error },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: t.ai.error }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating trigger (desktop only — mobile uses the speed-dial) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t.ai.assistant}
          className={cn(
            "fixed z-40 hidden h-14 w-14 items-center justify-center rounded-full md:bottom-6 md:right-6 md:flex",
            "bg-primary text-primary-foreground dark:text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95",
          )}
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl",
            "inset-x-3 bottom-20 top-20 md:inset-auto md:bottom-6 md:right-6 md:h-140 md:w-100 md:top-auto",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.ai.title}</p>
              <p className="truncate text-xs text-muted-foreground">{t.ai.subtitle}</p>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setMessages([])}
                aria-label={t.ai.clear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              aria-label="✕"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
            <div className="space-y-3 py-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="flex gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm">
                      {t.ai.greeting}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CHAT_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}
                >
                  {m.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                      m.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground dark:text-white"
                        : "rounded-tl-sm bg-muted",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t.ai.thinking}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.ai.placeholder}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
