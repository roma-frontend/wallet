"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquareText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/shared/date-picker";
import {
  useCategories,
  useAccounts,
  useBaseCurrency,
  useTransactionMutations,
  type Id,
} from "@/hooks/use-data";
import { CURRENCIES } from "@/lib/currencies";
import { todayISO } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Parsed {
  type: "income" | "expense";
  amount: number | null;
  currency: string | null;
  categoryName: string | null;
  note: string | null;
  date: string | null;
}

export function SmsImportDialog({ trigger }: { trigger: React.ReactNode }) {
  const categories = useCategories();
  const accounts = useAccounts().filter((a) => !a.archived);
  const baseCurrency = useBaseCurrency();
  const { add } = useTransactionMutations();

  const [open, setOpen] = useState(false);
  const [sms, setSms] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(baseCurrency);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSms("");
    setParsed(false);
    setType("expense");
    setAmount("");
    setCurrency(baseCurrency);
    setCategoryId("");
    setAccountId("");
    setNote("");
    setDate(todayISO());
  };

  const runParse = async () => {
    const text = sms.trim();
    if (!text) {
      toast.error(t.sms.empty);
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/ai-parse-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          today: todayISO(),
          categories: categories.map((c) => ({ name: c.name, type: c.type })),
        }),
      });
      if (!res.ok) {
        toast.error(t.sms.error);
        return;
      }
      const { parsed: p } = (await res.json()) as { parsed: Parsed };
      setType(p.type);
      if (p.amount != null) setAmount(String(p.amount));
      if (p.currency) setCurrency(p.currency);
      if (p.date) setDate(p.date);
      if (p.note) setNote(p.note);
      if (p.categoryName) {
        const match = categories.find(
          (c) =>
            c.type === p.type &&
            c.name.toLowerCase().trim() === p.categoryName!.toLowerCase().trim(),
        );
        if (match) setCategoryId(match._id);
      }
      setParsed(true);
      toast.success(t.form.parsed);
    } catch {
      toast.error(t.sms.error);
    } finally {
      setParsing(false);
    }
  };

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    if (!categoryId) {
      toast.error(t.form.categoryRequired);
      return;
    }
    setSaving(true);
    try {
      await add({
        type,
        amount: value,
        currency,
        categoryId: categoryId as Id<"categories">,
        accountId: accountId ? (accountId as Id<"accounts">) : undefined,
        note: note.trim() || undefined,
        date,
        recurrence: "none",
      });
      toast.success(t.toast.transactionAdded);
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  };

  const cats = categories.filter((c) => c.type === type);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            {t.sms.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.sms.subtitle}</Label>
            <textarea
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              placeholder={t.sms.placeholder}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              onClick={runParse}
              disabled={parsing || !sms.trim()}
              className="w-full"
            >
              {parsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {parsing ? t.sms.parsing : t.sms.parse}
            </Button>
          </div>

          {parsed && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-medium text-primary">{t.sms.detected}</p>

              <div className="grid grid-cols-2 gap-2">
                {(["expense", "income"] as const).map((ty) => (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => {
                      setType(ty);
                      setCategoryId("");
                    }}
                    className={cn(
                      "h-10 rounded-lg border text-sm font-medium transition-colors",
                      type === ty
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {t.type[ty]}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>{t.common.amount}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="tabular"
                  />
                </div>
                <div className="w-28 space-y-1.5">
                  <Label>{t.common.currency}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t.common.category}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.form.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => {
                      const Icon = getIcon(c.icon);
                      return (
                        <SelectItem key={c._id} value={c._id}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                            {c.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <Label>{t.nav.accounts}</Label>
                  <Select
                    value={accountId || "none"}
                    onValueChange={(v) => setAccountId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.accounts.selectAccount} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.accounts.noAccount}</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label>{t.common.date}</Label>
                  <DatePicker value={date} onChange={setDate} />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label>{t.common.note}</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </div>

              <Button onClick={save} className="w-full" disabled={saving}>
                {t.sms.confirm}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
