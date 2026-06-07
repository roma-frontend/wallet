"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HandCoins, Plus, Trash2, ArrowDownLeft, ArrowUpRight, Wallet, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DatePicker } from "@/components/shared/date-picker";
import {
  useDebts,
  useBaseCurrency,
  useDebtMutations,
  useDataLoading,
  type DebtDoc,
  type Id,
} from "@/hooks/use-data";
import { CATEGORY_COLORS } from "@/lib/categories";
import { CURRENCIES } from "@/lib/currencies";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { confirmDelete } from "@/store/use-confirm-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DebtKind = "owe" | "lent";

function DebtDialog({
  trigger,
  initial,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  initial?: DebtDoc;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { add, update } = useDebtMutations();
  const baseCurrency = useBaseCurrency();
  const isEdit = !!initial;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (o: boolean) => {
    if (onOpenChange) onOpenChange(o);
    else setUncontrolledOpen(o);
  };
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<DebtKind>(initial?.kind ?? "owe");
  const [principal, setPrincipal] = useState(initial ? String(initial.principal) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? baseCurrency);
  const [counterparty, setCounterparty] = useState(initial?.counterparty ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);

  const submit = async () => {
    const principalVal = Number(principal);
    if (!name.trim() || !principalVal || principalVal <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    if (isEdit && initial) {
      await update({
        id: initial._id,
        name: name.trim(),
        kind,
        principal: principalVal,
        currency,
        counterparty: counterparty.trim() || undefined,
        dueDate: dueDate || undefined,
        color,
      });
      toast.success(t.toast.debtUpdated);
    } else {
      await add({
        name: name.trim(),
        kind,
        principal: principalVal,
        currency,
        counterparty: counterparty.trim() || undefined,
        dueDate: dueDate || undefined,
        icon: "handCoins",
        color,
      });
      toast.success(t.toast.debtAdded);
      setName("");
      setPrincipal("");
      setCounterparty("");
      setDueDate("");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t.debts.edit : t.debts.add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as DebtKind)}>
            <TabsList className="w-full">
              <TabsTrigger value="owe" className="flex-1 gap-2">
                <ArrowUpRight className="w-4 h-4" /> {t.debts.owe}
              </TabsTrigger>
              <TabsTrigger value="lent" className="flex-1 gap-2">
                <ArrowDownLeft className="w-4 h-4" /> {t.debts.lent}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label>{t.debts.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.debts.namePlaceholder} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.debts.principal}</Label>
              <Input
                type="number"
                step="any"
                min="0"
                inputMode="decimal"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="0"
                className="tabular"
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label>{t.common.currency}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t.debts.counterparty} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
            <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder={t.debts.counterpartyPlaceholder} />
          </div>

          <div className="space-y-1.5">
            <Label>{t.debts.dueDate} <span className="text-muted-foreground text-xs">({t.common.optional})</span></Label>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="—" />
          </div>

          <div className="space-y-1.5">
            <Label>{t.category.color}</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-lg transition-transform", color === c && "ring-2 ring-offset-2 ring-offset-background scale-110")}
                  style={{ background: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} className="w-full">{isEdit ? t.common.save : t.common.add}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ debt }: { debt: DebtDoc }) {
  const { addPayment } = useDebtMutations();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const remaining = Math.max(0, debt.principal - debt.paid);

  const submit = async () => {
    const val = Number(amount);
    if (!val || val <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    await addPayment({ id: debt._id, amount: val });
    toast.success(t.toast.paymentAdded);
    setOpen(false);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <Wallet className="w-3.5 h-3.5" /> {t.debts.addPayment}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.debts.addPayment}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.debts.remaining}: <span className="font-semibold tabular">{formatCurrency(remaining, debt.currency as never)}</span>
          </p>
          <div className="space-y-1.5">
            <Label>{t.debts.paymentAmount}</Label>
            <Input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="tabular"
              autoFocus
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setAmount(String(remaining))}>
            {t.debts.payOff}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={submit} className="w-full">{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DebtCard({ debt }: { debt: DebtDoc }) {
  const { remove } = useDebtMutations();
  const [editOpen, setEditOpen] = useState(false);
  const remaining = Math.max(0, debt.principal - debt.paid);
  const pct = debt.principal > 0 ? Math.min(100, (debt.paid / debt.principal) * 100) : 0;
  const settled = remaining <= 0;
  const overdue = !settled && debt.dueDate && debt.dueDate < todayISO();

  const handleDelete = async () => {
    if (!(await confirmDelete())) return;
    await remove({ id: debt._id });
    toast.success(t.toast.debtDeleted);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: debt.color + "20" }}
          >
            <HandCoins className="w-5 h-5" style={{ color: debt.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{debt.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {debt.kind === "owe" ? t.debts.owe : t.debts.lent}
              {debt.counterparty && ` · ${debt.counterparty}`}
            </p>
          </div>
          <div className="flex gap-1">
            {!settled && (
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditOpen(true)} aria-label={t.common.edit}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={handleDelete} aria-label={t.common.delete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="tabular font-semibold">{formatCurrency(debt.paid, debt.currency as never)}</span>
            <span className="text-muted-foreground tabular">{formatCurrency(debt.principal, debt.currency as never)}</span>
          </div>
          <Progress value={pct} aria-label={`${t.debts.remaining} ${formatPercent(pct)}`} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          {settled ? (
            <span className="text-sm font-medium text-success">{t.debts.settled}</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t.debts.remaining}: <span className="font-semibold tabular text-foreground">{formatCurrency(remaining, debt.currency as never)}</span>
            </span>
          )}
          {debt.dueDate && (
            <span className={cn("text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
              {overdue && `${t.debts.overdue} · `}{formatDate(debt.dueDate)}
            </span>
          )}
        </div>

        {!settled && (
          <div className="flex gap-2">
            <PaymentDialog debt={debt} />
          </div>
        )}
      </CardContent>

      <DebtDialog
        initial={debt}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}

export default function DebtsPage() {
  const debts = useDebts();
  const baseCurrency = useBaseCurrency();
  const loading = useDataLoading();

  const { totalOwe, totalLent } = useMemo(() => {
    let owe = 0;
    let lent = 0;
    for (const d of debts) {
      const remaining = Math.max(0, d.principal - d.paid);
      if (d.kind === "owe") owe += remaining;
      else lent += remaining;
    }
    return { totalOwe: owe, totalLent: lent };
  }, [debts]);

  const sorted = [...debts].sort((a, b) => {
    const ra = a.principal - a.paid;
    const rb = b.principal - b.paid;
    if (ra <= 0 && rb > 0) return 1;
    if (rb <= 0 && ra > 0) return -1;
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });

  return (
    <div>
      <PageHeader
        title={t.debts.title}
        subtitle={t.debts.subtitle}
        action={
          <DebtDialog
            trigger={
              <Button>
                <Plus className="w-4 h-4" /> {t.debts.add}
              </Button>
            }
          />
        }
      />

      {!loading && debts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t.debts.totalOwe}</p>
              <p className="text-xl font-bold tabular text-destructive mt-1">{formatCurrency(totalOwe, baseCurrency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t.debts.totalLent}</p>
              <p className="text-xl font-bold tabular text-success mt-1">{formatCurrency(totalLent, baseCurrency)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : debts.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title={t.debts.noDebts}
          description={t.debts.noDebtsHint}
          action={
            <DebtDialog
              trigger={
                <Button>
                  <Plus className="w-4 h-4" /> {t.debts.add}
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((d) => (
            <DebtCard key={d._id} debt={d} />
          ))}
        </div>
      )}
    </div>
  );
}
