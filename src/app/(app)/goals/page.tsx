"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Target, Plus, Trash2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGoals,
  useBaseCurrency,
  useAccounts,
  useGoalMutations,
  useDataLoading,
  type GoalDoc,
  type Id,
} from "@/hooks/use-data";
import { useAccountBalances } from "@/hooks/use-finance";
import { CATEGORY_COLORS } from "@/lib/categories";
import { formatCurrency, formatDate } from "@/lib/format";
import { confirmDelete } from "@/store/use-confirm-store";
import { DatePicker } from "@/components/shared/date-picker";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function GoalDialog({ trigger }: { trigger: React.ReactNode }) {
  const { add } = useGoalMutations();
  const accounts = useAccounts().filter((a) => !a.archived);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [accountId, setAccountId] = useState("");

  const create = async () => {
    const targetVal = Number(target);
    if (!name.trim() || !targetVal || targetVal <= 0) {
      toast.error(t.form.amountPositive);
      return;
    }
    await add({
      name: name.trim(),
      icon: "piggyBank",
      color,
      target: targetVal,
      saved: accountId ? 0 : Number(saved) || 0,
      deadline: deadline || undefined,
      accountId: accountId ? (accountId as Id<"accounts">) : undefined,
    });
    toast.success(t.toast.budgetSaved);
    setOpen(false);
    setName("");
    setTarget("");
    setSaved("");
    setDeadline("");
    setAccountId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.goals.add}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.goals.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.goals.namePlaceholder} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>{t.goals.target}</Label>
              <Input type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" className="tabular" />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>{t.goals.saved}</Label>
              <Input type="number" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className="tabular" disabled={!!accountId} />
            </div>
          </div>
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t.goals.linkAccount} <span className="text-xs text-muted-foreground">({t.common.optional})</span></Label>
              <Select value={accountId || "none"} onValueChange={(v) => setAccountId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t.goals.manual} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.goals.manual}</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t.goals.linkAccountHint}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t.goals.deadline} <span className="text-xs text-muted-foreground">({t.common.optional})</span></Label>
            <DatePicker value={deadline} onChange={setDeadline} placeholder={t.goals.deadline} />
          </div>
          <div className="space-y-2">
            <Label>{t.category.color}</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={cn("w-7 h-7 rounded-lg", color === c && "ring-2 ring-offset-2 ring-offset-background")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={create} className="w-full">{t.common.add}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddFundsDialog({ goal }: { goal: GoalDoc }) {
  const { update } = useGoalMutations();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const add = async () => {
    const value = Number(amount);
    if (!value) return;
    await update({ id: goal._id, saved: Math.max(0, goal.saved + value) });
    toast.success(t.toast.budgetSaved);
    setOpen(false);
    setAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          <Plus className="w-3.5 h-3.5" /> {t.goals.addFunds}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.goals.addFunds}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="tabular text-lg"
            autoFocus
          />
          <Button onClick={add} className="w-full">{t.common.confirm}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal }: { goal: GoalDoc }) {
  const baseCurrency = useBaseCurrency();
  const { remove } = useGoalMutations();
  const balances = useAccountBalances();
  const linked = goal.accountId
    ? balances.find((b) => b.account._id === goal.accountId)
    : undefined;
  const saved = linked ? Math.max(0, linked.baseBalance) : goal.saved;
  const percent = goal.target > 0 ? Math.min(100, (saved / goal.target) * 100) : 0;
  const reached = saved >= goal.target;
  const remaining = Math.max(0, goal.target - saved);

  let monthlyNeeded = 0;
  if (goal.deadline && !reached) {
    const months = Math.max(
      1,
      (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30),
    );
    monthlyNeeded = remaining / months;
  }

  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: goal.color + "20" }}
            >
              <Target className="w-5 h-5" style={{ color: goal.color }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{goal.name}</p>
              {linked ? (
                <p className="text-xs text-muted-foreground truncate">
                  {t.goals.autoTracked}: {linked.account.name}
                </p>
              ) : (
                goal.deadline && (
                  <p className="text-xs text-muted-foreground">{formatDate(goal.deadline)}</p>
                )
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={t.common.delete}
            onClick={async () => {
              if (!(await confirmDelete())) return;
              await remove({ id: goal._id });
              toast.success(t.toast.budgetDeleted);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-end justify-between mb-2">
          <span className="text-xl font-bold tabular">
            {formatCurrency(saved, baseCurrency, { compact: true })}
          </span>
          <span className="text-sm text-muted-foreground tabular">
            / {formatCurrency(goal.target, baseCurrency, { compact: true })}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, background: goal.color }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="tabular font-medium" style={{ color: goal.color }}>
            {percent.toFixed(0)}% {t.goals.completion}
          </span>
          {reached ? (
            <span className="flex items-center gap-1 text-success font-medium">
              <Check className="w-3 h-3" /> {t.goals.reached}
            </span>
          ) : (
            <span className="tabular text-muted-foreground">
              {t.goals.remaining}: {formatCurrency(remaining, baseCurrency, { compact: true })}
            </span>
          )}
        </div>

        {monthlyNeeded > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {t.goals.monthlyNeeded}:{" "}
            <span className="font-medium text-foreground tabular">
              {formatCurrency(monthlyNeeded, baseCurrency, { compact: true })}
            </span>
          </p>
        )}

        {!reached && !linked && (
          <div className="flex gap-2 mt-4">
            <AddFundsDialog goal={goal} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const goals = useGoals();
  const loading = useDataLoading();

  return (
    <div>
      <PageHeader
        title={t.goals.title}
        subtitle={t.goals.subtitle}
        action={
          <GoalDialog
            trigger={
              <Button className="hidden md:inline-flex">
                <Plus className="w-4 h-4" /> {t.goals.add}
              </Button>
            }
          />
        }
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Target}
              title={t.goals.noGoals}
              description={t.goals.subtitle}
              action={
                <GoalDialog
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4" /> {t.goals.add}
                    </Button>
                  }
                />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {goals.map((g) => (
            <GoalCard key={g._id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
