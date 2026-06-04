"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useMe } from "@/hooks/use-data";
import { useFinanceSnapshot } from "@/hooks/use-finance";

interface Insight {
  icon: string;
  title: string;
  text: string;
}

export function AiInsights() {
  const me = useMe();
  const enabled = me?.settings?.enableAiInsights ?? false;
  const snapshot = useFinanceSnapshot();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  if (!enabled) return null;

  const hasData = snapshot.transactionCount > 0;

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.ai.error);
        setInsights([]);
      } else {
        setInsights(data.insights ?? []);
        setError((data.insights?.length ?? 0) === 0 ? t.ai.error : null);
      }
      setLoaded(true);
    } catch {
      setError(t.ai.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{t.ai.insights}</CardTitle>
            <p className="text-xs text-muted-foreground">{t.ai.insightsSubtitle}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={loading || !hasData}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loaded ? t.ai.regenerate : t.ai.generate}
        </Button>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.ai.noData}</p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.ai.analyzing}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        ) : insights.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border bg-muted/30 p-3.5"
              >
                <span className="text-xl leading-none">{insight.icon}</span>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{insight.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t.ai.insightsSubtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
