"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wallet, Plus, Trash2, Pencil, ArrowLeftRight, Archive, ArchiveRestore, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DatePicker } from "@/components/shared/date-picker";
import { SmsImportDialog } from "@/components/shared/sms-import-dialog";
import {
  useAccounts,
  useTransfers,
  useBaseCurrency,
  useAccountMutations,
  useDataLoading,
  type AccountDoc,
  type Id,
} from "@/hooks/use-data";
import { useAccountBalances, useNetWorth } from "@/hooks/use-finance";
import { CATEGORY_COLORS } from "@/lib/categories";
import { CURRENCIES } from "@/lib/currencies";
import { ICON_KEYS, getIcon } from "@/lib/icons";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { confirmDelete } from "@/store/use-confirm-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AccountType = "cash" | "card" | "savings" | "credit" | "other";
const ACCOUNT_TYPES: AccountType[] = ["cash", "card", "savings", "credit", "other"];
const TYPE_ICON: Record<AccountType, string> = {
  cash: "banknote",
  card: "creditCard",
  savings: "piggyBank",
  credit: "creditCard",
  other: "wallet",
};

function AccountDialog({
  trigger,
  initial,
}: {
  trigger: React.ReactNode;
  initial?: AccountDoc;
}) {
  const baseCurrency = useBaseCurrency();
  const { add, update } = useAccountMutations();
  const isEdit = Boolean(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>((initial?.type as AccountType) ?? "card");
  const [currency, setCurrency] = useState<string>(initial?.currency ?? baseCurrency);
  const [initialBalance, setInitialBalance] = useState(String(initial?.initialBalance ?? ""));
  const [icon, setIcon] = useState(initial?.icon ?? TYPE_ICON.card);
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error(t.form.nameRequired);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        currency,
        initialBalance: Number(initialBalance) || 0,
        icon,
        color,
      };
      if (isEdit && initial) {
        await update({ id: initial._id, ...payload });
      } else {
        await add(payload);
      }
      toast.success(t.toast.settingsSaved);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t.accounts.edit : t.accounts.add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.accounts.name}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.accounts.namePlaceholder}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.accounts.type}</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as AccountType);
                  setIcon(TYPE_ICON[v as AccountType]);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((ty) => (
                    <SelectItem key={ty} value={ty}>
                      {t.accounts.types[ty]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label>{t.accounts.initialBalance}</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              className="tabular"
            />
          </div>

          <div className="space-y-2">
            <Label>{t.accounts.color}</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn(
                    "w-7 h-7 rounded-lg transition-transform",
                    color === c && "ring-2 ring-offset-2 ring-offset-background scale-110",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.accounts.icon}</Label>
            <div className="grid grid-cols-7 gap-2 max-h-32 overflow-y-auto p-1">
              {ICON_KEYS.map((key) => {
                const Icon = getIcon(key);
                const active = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={key}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center border transition-colors",
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: active ? color : "var(--muted-foreground)" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={save} className="w-full" disabled={saving}>
            {isEdit ? t.common.save : t.common.add}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ trigger }: { trigger: React.ReactNode }) {
  const accounts = useAccounts().filter((a) => !a.archived);
  const baseCurrency = useBaseCurrency();
  const { addTransfer } = useAccountMutations();
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>(baseCurrency);
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    if (!fromId || !toId) {
      toast.error(t.accounts.selectAccount);
      return;
    }
    if (fromId === toId) {
      toast.error(t.transfer.sameAccount);
      return;
    }
    setSaving(true);
    try {
      await addTransfer({
        fromAccountId: fromId as Id<"accounts">,
        toAccountId: toId as Id<"accounts">,
        amount: value,
        currency,
        date,
        note: note.trim() || undefined,
      });
      toast.success(t.transfer.saved);
      setOpen(false);
      setAmount("");
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.transfer.add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.transfer.from}</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger>
                <SelectValue placeholder={t.accounts.selectAccount} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t.transfer.to}</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder={t.accounts.selectAccount} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.transfer.amount}</Label>
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
            <Label>{t.common.date}</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div className="space-y-1.5">
            <Label>{t.common.note}</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.form.notePlaceholder}
            />
          </div>

          <Button onClick={save} className="w-full" disabled={saving}>
            {t.common.add}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccountCard({
  account,
  balance,
  baseBalance,
}: {
  account: AccountDoc;
  balance: number;
  baseBalance: number;
}) {
  const baseCurrency = useBaseCurrency();
  const { update, remove } = useAccountMutations();
  const Icon = getIcon(account.icon);
  const sameCurrency = account.currency === baseCurrency;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border border-border bg-card",
        account.archived && "opacity-60",
      )}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: account.color + "20" }}
      >
        <Icon className="w-5 h-5" style={{ color: account.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{account.name}</p>
        <p className="text-xs text-muted-foreground">
          {t.accounts.types[account.type as AccountType]} · {account.currency}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold tabular">
          {formatCurrency(balance, account.currency as typeof baseCurrency, { compact: true })}
        </p>
        {!sameCurrency && (
          <p className="text-xs text-muted-foreground tabular">
            ≈ {formatCurrency(baseBalance, baseCurrency, { compact: true })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <AccountDialog
          initial={account}
          trigger={
            <Button variant="ghost" size="icon" className="w-7 h-7" aria-label={t.common.edit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          aria-label={account.archived ? t.accounts.unarchive : t.accounts.archive}
          onClick={() => update({ id: account._id, archived: !account.archived })}
        >
          {account.archived ? (
            <ArchiveRestore className="w-3.5 h-3.5" />
          ) : (
            <Archive className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-destructive"
          aria-label={t.common.delete}
          onClick={async () => {
            if (!(await confirmDelete())) return;
            await remove({ id: account._id });
            toast.success(t.toast.dataCleared);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const accounts = useAccounts();
  const balances = useAccountBalances();
  const netWorth = useNetWorth();
  const transfers = useTransfers();
  const baseCurrency = useBaseCurrency();
  const { removeTransfer } = useAccountMutations();
  const loading = useDataLoading();

  const accountName = (id: string) => accounts.find((a) => a._id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader
        title={t.accounts.title}
        subtitle={t.accounts.subtitle}
        action={
          <div className="hidden md:flex gap-2">
            <SmsImportDialog
              trigger={
                <Button variant="outline">
                  <MessageSquareText className="w-4 h-4" /> {t.sms.title}
                </Button>
              }
            />
            <TransferDialog
              trigger={
                <Button variant="outline">
                  <ArrowLeftRight className="w-4 h-4" /> {t.transfer.add}
                </Button>
              }
            />
            <AccountDialog
              trigger={
                <Button>
                  <Plus className="w-4 h-4" /> {t.accounts.add}
                </Button>
              }
            />
          </div>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Wallet}
              title={t.accounts.noAccounts}
              description={t.accounts.subtitle}
              action={
                <AccountDialog
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4" /> {t.accounts.add}
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="gradient-primary text-white border-0 shadow-soft">
            <CardContent className="py-5">
              <p className="text-sm/none opacity-80">{t.netWorth.title}</p>
              <p className="text-3xl font-bold tabular mt-2">
                {formatCurrency(netWorth, baseCurrency, { compact: true })}
              </p>
              <p className="text-xs opacity-80 mt-1">{t.netWorth.subtitle}</p>
            </CardContent>
          </Card>

          <div className="flex gap-2 md:hidden">
            <SmsImportDialog
              trigger={
                <Button variant="outline" className="flex-1">
                  <MessageSquareText className="w-4 h-4" /> SMS
                </Button>
              }
            />
            <TransferDialog
              trigger={
                <Button variant="outline" className="flex-1">
                  <ArrowLeftRight className="w-4 h-4" /> {t.transfer.add}
                </Button>
              }
            />
            <AccountDialog
              trigger={
                <Button className="flex-1">
                  <Plus className="w-4 h-4" /> {t.accounts.add}
                </Button>
              }
            />
          </div>

          <div className="space-y-2">
            {balances.map(({ account, balance, baseBalance }) => (
              <AccountCard
                key={account._id}
                account={account}
                balance={balance}
                baseBalance={baseBalance}
              />
            ))}
          </div>

          {transfers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.transfer.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {transfers.slice(0, 10).map((tr) => (
                  <div
                    key={tr._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {accountName(tr.fromAccountId)} → {accountName(tr.toAccountId)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(tr.date)}</p>
                    </div>
                    <p className="font-medium tabular shrink-0">
                      {formatCurrency(tr.amount, tr.currency as typeof baseCurrency, {
                        compact: true,
                      })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive shrink-0"
                      aria-label={t.common.delete}
                      onClick={async () => {
                        if (!(await confirmDelete())) return;
                        await removeTransfer({ id: tr._id });
                        toast.success(t.transfer.deleted);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
