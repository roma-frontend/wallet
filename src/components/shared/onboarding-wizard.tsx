"use client";

import { useState } from "react";
import { Wallet, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useMe, useSettingsMutations } from "@/hooks/use-data";
import { useCurrencyStore } from "@/store/use-currency-store";
import { CURRENCIES } from "@/lib/currencies";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 4;

/**
 * First-run onboarding wizard. Shows once per user (until `onboarded` is set),
 * collecting name, base currency and month-start day, then marking complete.
 */
export function OnboardingWizard() {
  const me = useMe();
  const { update } = useSettingsMutations();
  const setBaseCurrency = useCurrencyStore((s) => s.refreshRates);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(me?.name ?? me?.settings?.userName ?? "");
  const [currency, setCurrency] = useState(me?.settings?.baseCurrency ?? "AMD");
  const [monthStartDay, setMonthStartDay] = useState(me?.settings?.monthStartDay ?? 1);
  const [saving, setSaving] = useState(false);

  // Only show for a signed-in user who has settings but hasn't onboarded yet.
  const show = !!me?.settings && me.settings.onboarded === false;
  if (!show) return null;

  const finish = async () => {
    setSaving(true);
    try {
      await update({
        userName: name.trim() || me?.name || "",
        baseCurrency: currency,
        monthStartDay,
        onboarded: true,
      });
      setBaseCurrency(currency as Parameters<typeof setBaseCurrency>[0]);
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    await update({ onboarded: true });
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" aria-describedby="onboarding-desc">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <DialogTitle>{t.onboarding.welcomeTitle}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-2" id="onboarding-desc">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="min-h-45 py-2">
          {step === 0 && (
            <div className="space-y-3 text-center py-4">
              <Sparkles className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold text-lg">{t.onboarding.welcomeTitle}</p>
              <p className="text-sm text-muted-foreground">{t.onboarding.welcomeSubtitle}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">{t.onboarding.nameTitle}</p>
                <p className="text-sm text-muted-foreground">{t.onboarding.nameSubtitle}</p>
              </div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.onboarding.namePlaceholder}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">{t.onboarding.currencyTitle}</p>
                <p className="text-sm text-muted-foreground">{t.onboarding.currencySubtitle}</p>
              </div>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="pt-2">
                <Label className="text-sm">{t.onboarding.monthStartTitle}</Label>
                <p className="text-xs text-muted-foreground mb-1.5">{t.onboarding.monthStartSubtitle}</p>
                <Select value={String(monthStartDay)} onValueChange={(v) => setMonthStartDay(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} {t.onboarding.day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-success/15 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-success" />
              </div>
              <p className="font-semibold text-lg">{t.onboarding.readyTitle}</p>
              <p className="text-sm text-muted-foreground">{t.onboarding.readySubtitle}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {step > 0 ? (
            <Button variant="ghost" onClick={back} disabled={saving}>
              <ArrowLeft className="w-4 h-4" /> {t.onboarding.back}
            </Button>
          ) : (
            <Button variant="ghost" onClick={skip} disabled={saving}>
              {t.onboarding.skip}
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={next}>
              {t.onboarding.next} <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              <Check className="w-4 h-4" /> {t.onboarding.finish}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
