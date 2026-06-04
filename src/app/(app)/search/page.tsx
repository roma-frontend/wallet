"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionRow } from "@/components/shared/transaction-row";
import { EmptyState } from "@/components/shared/empty-state";
import { DatePicker } from "@/components/shared/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTransactions,
  useCategories,
  useAccounts,
  useBaseCurrency,
  useDataLoading,
} from "@/hooks/use-data";
import { useConvert } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/format";
import { t } from "@/lib/i18n";

export default function SearchPage() {
  const all = useTransactions();
  const categories = useCategories();
  const accounts = useAccounts();
  const baseCurrency = useBaseCurrency();
  const convertToBase = useConvert();
  const loading = useDataLoading();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [categoryId, setCategoryId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const catName = useMemo(() => new Map(categories.map((c) => [c._id, c.name])), [categories]);

  const activeCount =
    (type !== "all" ? 1 : 0) +
    (categoryId !== "all" ? 1 : 0) +
    (accountId !== "all" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const hasCriteria = query.trim() !== "" || activeCount > 0;

  const reset = () => {
    setQuery("");
    setType("all");
    setCategoryId("all");
    setAccountId("all");
    setFrom("");
    setTo("");
  };

  const filtered = useMemo(() => {
    if (!hasCriteria) return [];
    const q = query.trim().toLowerCase();
    return all
      .filter((tx) => type === "all" || tx.type === type)
      .filter((tx) => categoryId === "all" || tx.categoryId === categoryId)
      .filter((tx) => accountId === "all" || tx.accountId === accountId)
      .filter((tx) => !from || tx.date >= from)
      .filter((tx) => !to || tx.date <= to)
      .filter((tx) => {
        if (!q) return true;
        const name = tx.categoryId ? catName.get(tx.categoryId)?.toLowerCase() : undefined;
        return (name?.includes(q) ?? false) || (tx.note?.toLowerCase().includes(q) ?? false);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b._creationTime - a._creationTime);
  }, [all, hasCriteria, query, type, categoryId, accountId, from, to, catName]);

  const total = useMemo(
    () => filtered.reduce((s, tx) => s + convertToBase(tx.amount, tx.currency) * (tx.type === "expense" ? -1 : 1), 0),
    [filtered, convertToBase],
  );

  return (
    <div>
      <PageHeader title={t.search.title} subtitle={t.search.subtitle} />

      <div className="space-y-4">
        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="pl-9"
              autoFocus
              aria-label={t.search.title}
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters((s) => !s)}
            className="shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeCount > 0 && <span className="tabular">{activeCount}</span>}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.common.type}</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.search.allTypes}</SelectItem>
                    <SelectItem value="income">{t.search.income}</SelectItem>
                    <SelectItem value="expense">{t.search.expense}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.common.category}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.all}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.nav.accounts}</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.all}</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.search.dateFrom}</Label>
                  <DatePicker value={from} onChange={setFrom} placeholder="—" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.search.dateTo}</Label>
                  <DatePicker value={to} onChange={setTo} placeholder="—" />
                </div>
              </div>
              {activeCount > 0 && (
                <Button variant="ghost" size="sm" onClick={reset} className="justify-self-start">
                  <X className="w-4 h-4" /> {t.filters.reset}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!hasCriteria ? (
          <EmptyState icon={SearchIcon} title={t.search.start} description={t.search.startHint} />
        ) : loading ? (
          <EmptyState icon={SearchIcon} title={t.common.loading} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={SearchIcon} title={t.search.empty} description={t.search.emptyHint} />
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-sm text-muted-foreground">
                {filtered.length} {t.search.found}
              </span>
              <span className={`text-sm font-semibold tabular ${total < 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(total, baseCurrency)}
              </span>
            </div>
            <Card>
              <CardContent className="p-2 divide-y divide-border">
                {filtered.map((tx) => (
                  <TransactionRow key={tx._id} transaction={tx} />
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
