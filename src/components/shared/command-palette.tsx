"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Tag,
  BarChart3,
  PiggyBank,
  Target,
  Repeat,
  Globe,
  Settings,
  Search,
  Plus,
  Wallet,
  Moon,
  Eye,
  LogOut,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { getIcon } from "@/lib/icons";
import { useCommandStore } from "@/store/use-command-store";
import { useTxDialogStore } from "@/store/use-tx-dialog-store";
import { usePrefsStore } from "@/store/use-prefs-store";
import { useTransactions, useCategories, useBaseCurrency } from "@/hooks/use-data";
import { useConvert } from "@/hooks/use-finance";

interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  hint?: string;
  iconColor?: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const toggle = useCommandStore((s) => s.toggle);

  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { signOut } = useAuthActions();
  const togglePrivacy = usePrefsStore((s) => s.togglePrivacy);
  const openTxDialog = useTxDialogStore((s) => s.openDialog);

  const transactions = useTransactions();
  const categories = useCategories();
  const baseCurrency = useBaseCurrency();
  const convert = useConvert();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  /* Global ⌘K / Ctrl+K shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  /* Reset state on open */
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const close = () => setOpen(false);

  const navItems: CommandItem[] = useMemo(
    () => [
      { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
      { href: "/income", label: t.nav.income, icon: TrendingUp },
      { href: "/expenses", label: t.nav.expenses, icon: TrendingDown },
      { href: "/categories", label: t.nav.categories, icon: Tag },
      { href: "/budgets", label: t.nav.budgets, icon: PiggyBank },
      { href: "/goals", label: t.nav.goals, icon: Target },
      { href: "/recurring", label: t.nav.recurring, icon: Repeat },
      { href: "/accounts", label: t.nav.accounts, icon: Wallet },
      { href: "/analytics", label: t.nav.analytics, icon: BarChart3 },
      { href: "/currency", label: t.nav.currency, icon: Globe },
      { href: "/settings", label: t.nav.settings, icon: Settings },
    ].map((n) => ({
      id: `nav:${n.href}`,
      label: n.label,
      group: t.command.navigation,
      icon: n.icon,
      run: () => {
        router.push(n.href);
        close();
      },
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router],
  );

  const actionItems: CommandItem[] = useMemo(
    () => [
      {
        id: "act:add-expense",
        label: t.command.addExpense,
        group: t.command.actions,
        icon: Plus,
        run: () => {
          close();
          openTxDialog({ type: "expense" });
        },
      },
      {
        id: "act:add-income",
        label: t.command.addIncome,
        group: t.command.actions,
        icon: Plus,
        run: () => {
          close();
          openTxDialog({ type: "income" });
        },
      },
      {
        id: "act:theme",
        label: t.command.toggleTheme,
        group: t.command.actions,
        icon: Moon,
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          close();
        },
      },
      {
        id: "act:privacy",
        label: t.command.togglePrivacy,
        group: t.command.actions,
        icon: Eye,
        run: () => {
          togglePrivacy();
          close();
        },
      },
      {
        id: "act:signout",
        label: t.command.signOut,
        group: t.command.actions,
        icon: LogOut,
        run: () => {
          close();
          void signOut();
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedTheme],
  );

  /* Transaction search results (only when the user types) */
  const txItems: CommandItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const catById = new Map<string, (typeof categories)[number]>(
      categories.map((c) => [c._id as string, c]),
    );
    return transactions
      .filter((tx) => {
        const cat = catById.get(tx.categoryId as string);
        return (
          (cat?.name.toLowerCase().includes(q) ?? false) ||
          (tx.note?.toLowerCase().includes(q) ?? false) ||
          String(tx.amount).includes(q)
        );
      })
      .slice(0, 6)
      .map((tx) => {
        const cat = catById.get(tx.categoryId as string);
        return {
          id: `tx:${tx._id}`,
          label: cat?.name ?? t.common.category,
          group: t.command.transactions,
          icon: getIcon(cat?.icon ?? ""),
          iconColor: cat?.color,
          hint: `${formatDateShort(tx.date)} · ${tx.type === "income" ? "+" : "−"}${formatCurrency(
            convert(tx.amount, tx.currency),
            baseCurrency,
          )}`,
          run: () => {
            router.push(tx.type === "income" ? "/income" : "/expenses");
            close();
          },
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, transactions, categories, baseCurrency]);

  /* Filter nav + actions by query, then assemble the flat ordered list */
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (i: CommandItem) => !q || i.label.toLowerCase().includes(q);
    return [...navItems.filter(match), ...actionItems.filter(match), ...txItems];
  }, [query, navItems, actionItems, txItems]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items.length, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    }
  };

  /* Keep the active row scrolled into view */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  /* Render grouped */
  let lastGroup = "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 overflow-hidden top-[20%] translate-y-0 max-w-lg">
        <DialogTitle className="sr-only">{t.command.title}</DialogTitle>

        <div className="flex items-center gap-2.5 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.command.placeholder}
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.command.empty}</p>
          ) : (
            items.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const Icon = item.icon;
              return (
                <div key={item.id}>
                  {showGroup && (
                    <p className="px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onClick={() => item.run()}
                    onMouseMove={() => setActive(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      active === index ? "bg-accent text-accent-foreground" : "text-foreground",
                    )}
                  >
                    <span
                      className="flex w-7 h-7 items-center justify-center rounded-md shrink-0"
                      style={
                        item.iconColor
                          ? { background: item.iconColor + "26" }
                          : { background: "var(--muted)" }
                      }
                    >
                      <Icon
                        className="w-4 h-4"
                        style={item.iconColor ? { color: item.iconColor } : undefined}
                      />
                    </span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.hint && (
                      <span className="text-xs text-muted-foreground tabular shrink-0">
                        {item.hint}
                      </span>
                    )}
                    {active === index && !item.hint && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
