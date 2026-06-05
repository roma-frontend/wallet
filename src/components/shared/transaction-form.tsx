"use client";

import { createElement, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Sparkles, Loader2, X, Paperclip, Plus, Tag, ArrowRight, ArrowLeft, Check } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/shared/date-picker";
import {
  useCategories,
  useBaseCurrency,
  useAccounts,
  useTransactions,
  useTransactionMutations,
  useGenerateUploadUrl,
  useReceiptUrl,
  type TransactionDoc,
  type Id,
} from "@/hooks/use-data";
import { CURRENCIES } from "@/lib/currencies";
import { suggestCategory } from "@/lib/categorize";
import { t } from "@/lib/i18n";
import { todayISO } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number({ message: t.form.amountRequired }).positive(t.form.amountPositive),
  currency: z.string().min(1),
  categoryId: z.string().min(1, t.form.categoryRequired),
  accountId: z.string().optional(),
  date: z.string().min(1, t.form.dateRequired),
  note: z.string().optional(),
  recurrence: z.enum(["none", "weekly", "monthly", "yearly"]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  initial?: Partial<TransactionDoc>;
  defaultType?: TransactionType;
  prefillText?: string;
  onSuccess?: () => void;
}

const STEP_LABELS = [
  { key: "smart", label: t.wizard.smartStep },
  { key: "type", label: t.wizard.typeStep },
  { key: "amount", label: t.wizard.amountStep },
  { key: "details", label: t.wizard.detailsStep },
  { key: "extras", label: t.wizard.extrasStep },
] as const;

export function TransactionForm({ initial, defaultType, prefillText, onSuccess }: Props) {
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const accounts = useAccounts().filter((a) => !a.archived);
  const transactions = useTransactions();
  const { add, update } = useTransactionMutations();
  const generateUploadUrl = useGenerateUploadUrl();
  const isEdit = !!initial?._id;

  /* ── Wizard ──
   *  Edit mode skips the smart-parse step, so totalSteps is 4 instead of 5.
   *  step 0 is always the first visible step for the current mode.
   *  For create: step 0 = smart, 1 = type, 2 = amount, 3 = details, 4 = extras.
   *  For edit:   step 0 = type, 1 = amount, 2 = details, 3 = extras.
   */
  const totalSteps = isEdit ? 4 : 5;
  const [step, setStep] = useState(0);
  const nextStep = () => setStep((s) => Math.min(totalSteps - 1, s + 1));
  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  const isSmart = !isEdit && step === 0;
  const isType = (!isEdit && step === 1) || (isEdit && step === 0);
  const isAmount = (!isEdit && step === 2) || (isEdit && step === 1);
  const isDetails = (!isEdit && step === 3) || (isEdit && step === 2);
  const isExtras = (!isEdit && step === 4) || (isEdit && step === 3);

  /* ── Tags ── */
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  /* ── Splits ── */
  const [splits, setSplits] = useState<{ categoryId: string; amount: string }[]>(
    (initial?.splits ?? []).map((s) => ({
      categoryId: s.categoryId ?? "",
      amount: String(s.amount),
    })),
  );

  /* ── Receipt photo ── */
  const [receiptId, setReceiptId] = useState<Id<"_storage"> | undefined>(initial?.receiptId);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptUrl = useReceiptUrl(receiptId);

  const handleReceiptPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      setReceiptId(storageId);
    } catch {
      toast.error(t.toast.importError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initial?.type ?? defaultType ?? "expense",
      amount: initial?.amount,
      currency: initial?.currency ?? baseCurrency,
      categoryId: initial?.categoryId ?? "",
      accountId: initial?.accountId ?? "",
      date: initial?.date ?? todayISO(),
      note: initial?.note ?? "",
      recurrence: initial?.recurrence ?? "none",
    },
  });

  const type = watch("type") as TransactionType;
  const filteredCategories = categories.filter((c) => c.type === type);

  const autoCategorize = (note: string) => {
    if (!note.trim() || watch("categoryId")) return;
    const validIds = new Set(filteredCategories.map((c) => c._id));
    const suggested = suggestCategory(note, type, transactions, validIds);
    if (suggested) setValue("categoryId", suggested);
  };

  /* ── Smart natural-language add ── */
  const [smartText, setSmartText] = useState(prefillText ?? "");
  const [parsing, setParsing] = useState(false);

  const runSmartParse = async () => {
    const text = smartText.trim();
    if (!text) {
      toast.error(t.form.parseEmpty);
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          today: todayISO(),
          categories: categories.map((c) => ({ name: c.name, type: c.type })),
        }),
      });
      if (!res.ok) {
        toast.error(t.form.parseError);
        return;
      }
      const { parsed } = (await res.json()) as {
        parsed: {
          type: "income" | "expense";
          amount: number | null;
          categoryName: string | null;
          note: string | null;
          date: string | null;
        };
      };

      setValue("type", parsed.type);
      if (parsed.amount != null) setValue("amount", parsed.amount);
      if (parsed.date) setValue("date", parsed.date);
      if (parsed.note) setValue("note", parsed.note);
      if (parsed.categoryName) {
        const match = categories.find(
          (c) =>
            c.type === parsed.type &&
            c.name.toLowerCase().trim() === parsed.categoryName!.toLowerCase().trim(),
        );
        if (match) setValue("categoryId", match._id);
      }
      toast.success(t.form.parsed);
      nextStep();
    } catch {
      toast.error(t.form.parseError);
    } finally {
      setParsing(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const payload = {
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      categoryId: data.categoryId as Id<"categories">,
      accountId: data.accountId ? (data.accountId as Id<"accounts">) : undefined,
      date: data.date,
      note: data.note || undefined,
      recurrence: data.recurrence,
      tags: tags.length ? tags : undefined,
      splits: splits.length
        ? splits
            .filter((s) => Number(s.amount) > 0)
            .map((s) => ({
              categoryId: s.categoryId ? (s.categoryId as Id<"categories">) : undefined,
              amount: Number(s.amount),
            }))
        : undefined,
      receiptId,
    };
    try {
      if (isEdit && initial?._id) {
        await update({ id: initial._id, ...payload });
        toast.success(t.toast.transactionUpdated);
      } else {
        await add(payload);
        toast.success(t.toast.transactionAdded);
      }
      onSuccess?.();
    } catch {
      toast.error(t.toast.importError);
    }
  };

  const currentLabel = isSmart ? STEP_LABELS[0].label
    : isType ? STEP_LABELS[1].label
    : isAmount ? STEP_LABELS[2].label
    : isDetails ? STEP_LABELS[3].label
    : STEP_LABELS[4].label;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5 justify-center">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted",
            )}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-xs text-center text-muted-foreground font-medium">
        {currentLabel}
      </p>

      {/* ── Smart parse step (create only) ── */}
      {isSmart && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <Sparkles className="w-4 h-4" />
            {t.form.smartAdd}
          </div>
          <div className="flex gap-2">
            <Input
              value={smartText}
              onChange={(e) => setSmartText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!parsing) runSmartParse();
                }
              }}
              placeholder={t.form.smartAddPlaceholder}
              disabled={parsing}
              className="bg-background"
              autoFocus
            />
            <Button
              type="button"
              variant="secondary"
              onClick={runSmartParse}
              disabled={parsing || !smartText.trim()}
              className="shrink-0"
            >
              {parsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t.form.smartAddHint}</p>
        </div>
      )}

      {/* ── Type + Category ── */}
      {isType && (
        <div className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => {
              setValue("type", v as TransactionType);
              setValue("categoryId", "");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1 gap-2">
                <ArrowUpRight className="w-4 h-4" /> {t.type.expense}
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1 gap-2">
                <ArrowDownLeft className="w-4 h-4" /> {t.type.income}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label>{t.common.category}</Label>
            <Select value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v)}>
              <SelectTrigger className={cn(errors.categoryId && "border-destructive")}>
                <SelectValue placeholder={t.form.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((c) => {
                  const icon = getIcon(c.icon);
                  return (
                    <SelectItem key={c._id} value={c._id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ background: c.color + "30" }}
                        >
                          {createElement(icon, { className: "w-3 h-3", style: { color: c.color } })}
                        </span>
                        {c.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Amount + Currency + Account ── */}
      {isAmount && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.common.amount}</Label>
              <Input
                {...register("amount", { valueAsNumber: true })}
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                placeholder={t.form.amountPlaceholder}
                className={cn("tabular text-lg font-semibold", errors.amount && "border-destructive")}
                autoFocus
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="w-32 space-y-1.5">
              <Label>{t.common.currency}</Label>
              <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v)}>
                <SelectTrigger>
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

          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t.nav.accounts}</Label>
              <Select
                value={watch("accountId") || "none"}
                onValueChange={(v) => setValue("accountId", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.accounts.selectAccount} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.accounts.noAccount}</SelectItem>
                  {accounts.map((a) => {
                    const icon = getIcon(a.icon);
                    return (
                      <SelectItem key={a._id} value={a._id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center"
                            style={{ background: a.color + "30" }}
                          >
                            {createElement(icon, { className: "w-3 h-3", style: { color: a.color } })}
                          </span>
                          {a.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* ── Date + Recurrence + Note + Tags ── */}
      {isDetails && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.common.date}</Label>
              <DatePicker
                value={watch("date")}
                onChange={(iso) => setValue("date", iso)}
                className={cn(errors.date && "border-destructive")}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>{t.recurrence.label}</Label>
              <Select
                value={watch("recurrence")}
                onValueChange={(v) => setValue("recurrence", v as FormValues["recurrence"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["none", "weekly", "monthly", "yearly"] as const).map((r) => (
                    <SelectItem key={r} value={r}>
                      {t.recurrence[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {t.common.note}{" "}
              <span className="text-muted-foreground text-xs">({t.common.optional})</span>
            </Label>
            <Input
              {...register("note", { onBlur: (e) => autoCategorize(e.target.value) })}
              placeholder={t.form.notePlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> {t.form.tags}{" "}
              <span className="text-muted-foreground text-xs">({t.common.optional})</span>
            </Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t2) => t2 !== tag))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={t.common.delete}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder={t.form.tagsPlaceholder}
            />
          </div>
        </div>
      )}

      {/* ── Splits + Receipt + Submit ── */}
      {isExtras && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">{t.form.splits}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSplits([...splits, { categoryId: "", amount: "" }])}
              >
                <Plus className="w-3.5 h-3.5" /> {t.form.addSplit}
              </Button>
            </div>
            {splits.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Select
                  value={s.categoryId || "none"}
                  onValueChange={(v) =>
                    setSplits(splits.map((x, j) => (j === i ? { ...x, categoryId: v === "none" ? "" : v } : x)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t.form.selectCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.common.none}</SelectItem>
                    {filteredCategories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={s.amount}
                  onChange={(e) =>
                    setSplits(splits.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
                  }
                  placeholder="0"
                  className="w-28 tabular"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSplits(splits.filter((_, j) => j !== i))}
                  aria-label={t.common.delete}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" /> {t.form.receipt}{" "}
              <span className="text-muted-foreground text-xs">({t.common.optional})</span>
            </Label>
            {receiptId && receiptUrl ? (
              <div className="relative inline-block">
                <img
                  src={receiptUrl}
                  alt={t.form.receipt}
                  className="h-32 w-auto rounded-xl border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow"
                  onClick={() => setReceiptId(undefined)}
                  aria-label={t.form.removeReceipt}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
                {uploading ? t.form.receiptUploading : t.form.addReceipt}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleReceiptPick}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Check className="w-4 h-4 mr-1.5" />
            {isEdit ? t.common.save : t.common.add}
          </Button>
        </div>
      )}

      {/* ── Navigation: Back + Next (all steps except last) ── */}
      {step < totalSteps - 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4" /> {t.wizard.back}
              </Button>
            )}
          </div>
          <Button type="button" onClick={nextStep}>
            {t.wizard.next} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── Back button on final step ── */}
      {step === totalSteps - 1 && (
        <div className="pt-1">
          <Button type="button" variant="ghost" onClick={prevStep}>
            <ArrowLeft className="w-4 h-4" /> {t.wizard.back}
          </Button>
        </div>
      )}
    </form>
  );
}
