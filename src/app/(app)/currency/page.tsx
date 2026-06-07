"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useCurrencyStore } from "@/store/use-currency-store";
import { useBaseCurrency } from "@/hooks/use-data";
import { CURRENCIES, convert, currencyMeta } from "@/lib/currencies";
import { formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { CurrencyCode } from "@/lib/types";

export default function CurrencyPage() {
  const baseCurrency = useBaseCurrency();
  const rates = useCurrencyStore((s) => s.rates);
  const loading = useCurrencyStore((s) => s.loading);
  const refreshRates = useCurrencyStore((s) => s.refreshRates);

  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<CurrencyCode>("USD");
  const [to, setTo] = useState<CurrencyCode>(baseCurrency);

  const value = Number(amount) || 0;
  const converted = convert(value, from, to, rates);
  const isLive = rates.fetchedAt > 0;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const refresh = async () => {
    await refreshRates(baseCurrency);
    toast.success(t.toast.ratesUpdated);
  };

  return (
    <div>
      <PageHeader
        title={t.currency.title}
        subtitle={t.currency.subtitle}
        action={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            {t.currency.refresh}
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Converter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" /> {t.currency.converter}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.common.amount}</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular text-lg h-12"
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>{t.currency.from}</Label>
                <Select value={from} onValueChange={(v) => setFrom(v as CurrencyCode)}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label aria-hidden className="invisible">
                  .
                </Label>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={swap}
                  aria-label={t.currency.converter}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>{t.currency.to}</Label>
                <Select value={to} onValueChange={(v) => setTo(v as CurrencyCode)}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl gradient-primary p-5 text-center text-primary-foreground dark:text-white">
              <p className="text-sm opacity-90">
                {formatNumber(value, 2)} {from} =
              </p>
              <p className="text-3xl font-bold tabular mt-1">
                {formatNumber(converted, 2)} {currencyMeta(to).symbol}
              </p>
              <p className="text-xs opacity-80 mt-2">
                1 {from} = {formatNumber(convert(1, from, to, rates), 4)} {to}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rates table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.currency.rates}</CardTitle>
              <span
                className={
                  "flex items-center gap-1 text-xs " +
                  (isLive ? "text-success" : "text-muted-foreground")
                }
              >
                {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isLive ? t.currency.live : t.currency.offline}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              {t.currency.perUnit} · {t.currency.baseCurrency}: {baseCurrency}
            </p>
            <div className="divide-y divide-border">
              {CURRENCIES.filter((c) => c.code !== baseCurrency).map((c) => {
                const rate = convert(1, c.code, baseCurrency, rates);
                return (
                  <div key={c.code} className="flex items-center gap-3 py-2.5">
                    <span className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                      {c.symbol}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                    </div>
                    <span className="tabular text-sm font-medium">
                      {formatNumber(rate, 2)} {currencyMeta(baseCurrency).symbol}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
