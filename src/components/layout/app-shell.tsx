"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Wallet,
  Menu,
  LogOut,
  Search,
  HandCoins,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PrivacyToggle } from "@/components/shared/privacy-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-data";
import { useCommandStore } from "@/store/use-command-store";
import { OnboardingWizard } from "@/components/shared/onboarding-wizard";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
  { href: "/income", label: t.nav.income, icon: TrendingUp },
  { href: "/expenses", label: t.nav.expenses, icon: TrendingDown },
  { href: "/categories", label: t.nav.categories, icon: Tag },
  { href: "/budgets", label: t.nav.budgets, icon: PiggyBank },
  { href: "/goals", label: t.nav.goals, icon: Target },
  { href: "/recurring", label: t.nav.recurring, icon: Repeat },
  { href: "/accounts", label: t.nav.accounts, icon: Wallet },
  { href: "/debts", label: t.nav.debts, icon: HandCoins },
  { href: "/calendar", label: t.nav.calendar, icon: CalendarDays },
  { href: "/analytics", label: t.nav.analytics, icon: BarChart3 },
  { href: "/search", label: t.nav.search, icon: Search },
  { href: "/currency", label: t.nav.currency, icon: Globe },
  { href: "/settings", label: t.nav.settings, icon: Settings },
];

// Two items on each side of the elevated center action button.
const MOBILE_LEFT = ["/", "/expenses"];
const MOBILE_RIGHT = ["/analytics"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "rounded-xl gradient-primary flex items-center justify-center shadow-soft",
          small ? "w-8 h-8" : "w-9 h-9",
        )}
      >
        <Wallet className={cn("text-white", small ? "w-4 h-4" : "w-5 h-5")} />
      </div>
      <div>
        <p className="font-bold text-base leading-tight text-foreground">{t.appName}</p>
        {!small && (
          <p className="text-[10px] text-muted-foreground leading-tight">Անձնական ֆինանսներ</p>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut } = useAuthActions();
  const me = useMe();
  const openCommand = useCommandStore((s) => s.setOpen);

  const leftItems = MOBILE_LEFT.map((h) => NAV_ITEMS.find((i) => i.href === h)!);
  const rightItems = MOBILE_RIGHT.map((h) => NAV_ITEMS.find((i) => i.href === h)!);

  return (
    <div className="flex h-full min-h-screen">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-sidebar fixed top-0 left-0 h-full z-30">
        <div className="flex items-center px-6 py-5 border-b border-border">
          <Link href="/" className="hover:opacity-80 transition-opacity" aria-label={t.appName}>
            <Logo />
          </Link>
        </div>

        <div className="px-3 pt-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => openCommand(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCommand(true);
              }
            }}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "hover:bg-muted hover:text-foreground hover:border-primary/30 hover:shadow-[0_0_0_3px_var(--primary)/0.08]",
              "focus-within:w-full focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_var(--primary)/0.1] focus-within:bg-background",
            )}
          >
            <Search className="w-4 h-4 shrink-0 transition-colors group-hover:text-primary" />
            <span className="flex-1 text-left">{t.common.search}</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium tabular opacity-60 group-hover:opacity-100 transition-opacity">
              ⌘K
            </kbd>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {me?.email && (
            <p className="px-3 text-xs text-muted-foreground truncate" title={me.email}>
              {me.settings?.userName || me.email}
            </p>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PrivacyToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.auth.signOut}
              onClick={() => void signOut()}
              className="shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <Link href="/" className="hover:opacity-80 transition-opacity" aria-label={t.appName}>
            <Logo small />
          </Link>
          <div className="flex items-center gap-1">
            <PrivacyToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 mx-auto w-full max-w-6xl">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/85 backdrop-blur-xl border-t border-border safe-area-pb">
        <ul className="flex items-center justify-around px-2 py-1.5">
          {leftItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <NavTab href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
            </li>
          ))}

          {/* Center spacer — the elevated MobileFab sits here */}
          <li aria-hidden className="w-14 shrink-0" />

          {rightItems.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <NavTab href={href} label={label} Icon={Icon} active={isActive(pathname, href)} />
            </li>
          ))}

          {/* More */}
          <li>
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-muted-foreground active:scale-95 transition-transform"
                  aria-label={t.common.all}
                >
                  <span className="flex h-7 w-11 items-center justify-center rounded-full">
                    <Menu className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-medium leading-none">{t.common.all}</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-muted" />
                <SheetTitle className="px-4 pt-2">{t.appName}</SheetTitle>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-foreground hover:bg-muted",
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => {
                      setMoreOpen(false);
                      void signOut();
                    }}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border border-border text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-6 h-6" />
                    <span className="text-xs font-medium">{t.auth.signOut}</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>

      <OnboardingWizard />
    </div>
  );
}

function NavTab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl active:scale-95 transition-transform",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-11 items-center justify-center rounded-full transition-colors",
          active && "bg-primary/15",
        )}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}
