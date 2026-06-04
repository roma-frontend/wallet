"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  User,
  Palette,
  Coins,
  Calendar,
  Download,
  Upload,
  Trash2,
  Info,
  Sparkles,
  Send,
  Bell,
  Loader2,
  Eye,
  RotateCcw,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  useMe,
  useBaseCurrency,
  useSettingsMutations,
  useExportData,
  useNotificationActions,
  useTransactionMutations,
  useCategories,
  useAccounts,
} from "@/hooks/use-data";
import { useCurrencyStore } from "@/store/use-currency-store";
import { usePrefsStore, ACCENTS, LANDING_PAGES, DASHBOARD_WIDGETS } from "@/store/use-prefs-store";
import { CURRENCIES } from "@/lib/currencies";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { transactionsToCsv, parseTransactionsCsv } from "@/lib/csv";
import type { CurrencyCode } from "@/lib/types";
interface ExportSnapshot {
  categories: { _id: string; name: string; icon: string; color: string; type: "income" | "expense"; isDefault?: boolean }[];
  transactions: {
    _id: string;
    type: "income" | "expense";
    amount: number;
    currency: string;
    categoryId?: string;
    note?: string;
    date: string;
    recurrence: "none" | "weekly" | "monthly" | "yearly";
  }[];
}

export default function SettingsPage() {
  const me = useMe();
  const baseCurrency = useBaseCurrency();
  const { update, clearData, importData } = useSettingsMutations();
  const { sendTest, sendReport, sendBudgetAlert, sendDailyAiReport } = useNotificationActions();
  const exportData = useExportData();
  const { importCsv } = useTransactionMutations();
  const categories = useCategories();
  const accounts = useAccounts();
  const refreshRates = useCurrencyStore((s) => s.refreshRates);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const accent = usePrefsStore((s) => s.accent);
  const setAccent = usePrefsStore((s) => s.setAccent);
  const density = usePrefsStore((s) => s.density);
  const setDensity = usePrefsStore((s) => s.setDensity);
  const privacy = usePrefsStore((s) => s.privacy);
  const setPrivacy = usePrefsStore((s) => s.setPrivacy);
  const defaultPage = usePrefsStore((s) => s.defaultPage);
  const setDefaultPage = usePrefsStore((s) => s.setDefaultPage);
  const widgets = usePrefsStore((s) => s.widgets);
  const toggleWidget = usePrefsStore((s) => s.toggleWidget);
  const confirmDelete = usePrefsStore((s) => s.confirmDelete);
  const setConfirmDelete = usePrefsStore((s) => s.setConfirmDelete);
  const resetPrefs = usePrefsStore((s) => s.reset);

  const [name, setName] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [botToken, setBotToken] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [tgBusy, setTgBusy] = useState<null | "test" | "report" | "alert" | "ai">(null);

  const settings = me?.settings;
  const userName = name ?? settings?.userName ?? "";
  const monthStartDay = settings?.monthStartDay ?? 1;

  const enableAiChat = settings?.enableAiChat ?? false;
  const enableAiInsights = settings?.enableAiInsights ?? false;
  const enableTelegram = settings?.enableTelegram ?? false;
  const hasTelegramToken = settings?.hasTelegramToken ?? false;
  // The bot token is a secret and is never sent back from the server. The
  // input only holds new edits; an empty field means "keep the stored token".
  const telegramBotToken = botToken ?? "";
  const telegramChatId = chatId ?? settings?.telegramChatId ?? "";
  const reportSchedule = settings?.reportSchedule ?? "off";
  const enableBudgetAlerts = settings?.enableBudgetAlerts ?? false;
  const enableTxNotifications = settings?.enableTxNotifications ?? false;
  const enableDailyAiReport = settings?.enableDailyAiReport ?? false;

  const tgConfigured =
    (hasTelegramToken || telegramBotToken.trim() !== "") && telegramChatId.trim() !== "";

  const saveName = async () => {
    await update({ userName });
    toast.success(t.toast.settingsSaved);
  };

  const changeCurrency = async (value: string) => {
    await update({ baseCurrency: value });
    await refreshRates(value as CurrencyCode);
    toast.success(t.toast.settingsSaved);
  };

  const changeMonthStart = async (value: string) => {
    await update({ monthStartDay: Number(value) });
    toast.success(t.toast.settingsSaved);
  };

  const toggleSetting = async (
    patch: Partial<{
      enableAiChat: boolean;
      enableAiInsights: boolean;
      enableTelegram: boolean;
      enableBudgetAlerts: boolean;
      enableTxNotifications: boolean;
      enableDailyAiReport: boolean;
    }>,
  ) => {
    await update(patch);
    toast.success(t.toast.settingsSaved);
  };

  const saveTelegramConfig = async () => {
    const patch: { telegramBotToken?: string; telegramChatId?: string } = {};
    if (botToken !== null) patch.telegramBotToken = botToken.trim();
    if (chatId !== null) patch.telegramChatId = chatId.trim();
    if (Object.keys(patch).length === 0) return;
    await update(patch);
    if (botToken !== null) setBotToken(null); // restore the masked placeholder
    toast.success(t.toast.settingsSaved);
  };

  const changeReportSchedule = async (value: string) => {
    await update({ reportSchedule: value as "off" | "daily" | "weekly" | "monthly" });
    toast.success(t.toast.settingsSaved);
  };

  const handleTestTelegram = async () => {
    if (!tgConfigured) {
      toast.error(t.telegram.notConfigured);
      return;
    }
    setTgBusy("test");
    try {
      await saveTelegramConfig();
      await sendTest({});
      toast.success(t.telegram.testSent);
    } catch {
      toast.error(t.telegram.testError);
    } finally {
      setTgBusy(null);
    }
  };

  const handleSendReport = async () => {
    if (!tgConfigured) {
      toast.error(t.telegram.notConfigured);
      return;
    }
    setTgBusy("report");
    try {
      await saveTelegramConfig();
      await sendReport({ period: "monthly" });
      toast.success(t.telegram.reportSent);
    } catch {
      toast.error(t.telegram.testError);
    } finally {
      setTgBusy(null);
    }
  };

  const handleCheckBudgets = async () => {
    if (!tgConfigured) {
      toast.error(t.telegram.notConfigured);
      return;
    }
    setTgBusy("alert");
    try {
      await saveTelegramConfig();
      const result = await sendBudgetAlert({});
      const count = result?.alerted ?? 0;
      toast.success(
        count > 0
          ? `${count} ${t.telegram.budgetsExceeded}`
          : t.telegram.noBudgetExceeded,
      );
    } catch {
      toast.error(t.telegram.testError);
    } finally {
      setTgBusy(null);
    }
  };

  const handleSendAiReport = async () => {
    if (!tgConfigured) {
      toast.error(t.telegram.notConfigured);
      return;
    }
    setTgBusy("ai");
    try {
      await saveTelegramConfig();
      await sendDailyAiReport({});
      toast.success(t.telegram.aiReportSent);
    } catch {
      toast.error(t.telegram.testError);
    } finally {
      setTgBusy(null);
    }
  };

  const handleExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dramapanak-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.toast.dataExported);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportSnapshot;
      if (!Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
        throw new Error("invalid");
      }
      const idToName = new Map(data.categories.map((c) => [c._id, c.name]));
      await importData({
        categories: data.categories.map((c) => ({
          name: c.name,
          icon: c.icon,
          color: c.color,
          type: c.type,
          isDefault: c.isDefault ?? false,
        })),
        transactions: data.transactions.map((tx) => ({
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          categoryName: tx.categoryId ? idToName.get(tx.categoryId) : undefined,
          note: tx.note,
          date: tx.date,
          recurrence: tx.recurrence,
        })),
      });
      toast.success(t.toast.dataImported);
    } catch {
      toast.error(t.toast.importError);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExportCsv = () => {
    if (!exportData) return;
    const catName = new Map(categories.map((c) => [c._id, c.name]));
    const accName = new Map(accounts.map((a) => [a._id, a.name]));
    const rows = exportData.transactions.map((tx) => ({
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      categoryName: tx.categoryId ? catName.get(tx.categoryId) : undefined,
      accountName: tx.accountId ? accName.get(tx.accountId) : undefined,
      note: tx.note,
    }));
    const blob = new Blob([transactionsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dramapanak-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.toast.dataExported);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { rows } = parseTransactionsCsv(text);
      if (rows.length === 0) {
        toast.error(t.toast.csvEmpty);
        return;
      }
      const { inserted } = await importCsv({ rows });
      toast.success(`${inserted} ${t.toast.csvImported}`);
    } catch {
      toast.error(t.toast.importError);
    } finally {
      if (csvFileRef.current) csvFileRef.current.value = "";
    }
  };

  const handleClear = async () => {
    await clearData();
    setClearOpen(false);
    toast.success(t.toast.dataCleared);
  };

  return (
    <div>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <Tabs defaultValue="general" className="max-w-2xl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-1.5">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t.settings.tabs.general}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{t.settings.tabs.appearance}</span>
          </TabsTrigger>
          <TabsTrigger value="smart" className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{t.settings.tabs.smart}</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t.settings.tabs.data}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-4">
          {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> {t.settings.profile}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.settings.name}</Label>
              <div className="flex gap-2">
                <Input
                  value={userName}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.auth.namePlaceholder}
                />
                <Button onClick={saveName} variant="outline">
                  {t.common.save}
                </Button>
              </div>
            </div>
            {me?.email && (
              <div className="space-y-1.5">
                <Label>{t.auth.email}</Label>
                <Input value={me.email} disabled />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency + month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4" /> {t.settings.baseCurrency}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t.settings.baseCurrency}</Label>
              <Select value={baseCurrency} onValueChange={changeCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t.settings.baseCurrencyHint}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> {t.settings.monthStart}
              </Label>
              <Select value={String(monthStartDay)} onValueChange={changeMonthStart}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4 mt-4">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" /> {t.settings.appearance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t.settings.theme}</p>
                <p className="text-xs text-muted-foreground">{t.settings.appearance}</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Personalization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t.prefs.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t.prefs.subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Accent color */}
            <div className="space-y-2">
              <Label>{t.prefs.accent}</Label>
              <div className="flex flex-wrap gap-2.5">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => setAccent(a.key)}
                    aria-label={a.label}
                    title={a.label}
                    className={cn(
                      "h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform hover:scale-110",
                      accent === a.key ? "ring-foreground" : "ring-transparent",
                    )}
                    style={{ backgroundColor: a.swatch }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t.prefs.accentHint}</p>
            </div>

            {/* Density */}
            <div className="space-y-1.5">
              <Label>{t.prefs.density}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={density === "comfortable" ? "default" : "outline"}
                  onClick={() => setDensity("comfortable")}
                >
                  {t.prefs.comfortable}
                </Button>
                <Button
                  variant={density === "compact" ? "default" : "outline"}
                  onClick={() => setDensity("compact")}
                >
                  {t.prefs.compact}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t.prefs.densityHint}</p>
            </div>

            {/* Privacy mode */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> {t.prefs.privacy}
                </p>
                <p className="text-xs text-muted-foreground">{t.prefs.privacyHint}</p>
              </div>
              <Switch checked={privacy} onCheckedChange={setPrivacy} />
            </div>

            {/* Default landing page */}
            <div className="space-y-1.5">
              <Label>{t.prefs.defaultPage}</Label>
              <Select value={defaultPage} onValueChange={setDefaultPage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANDING_PAGES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t.nav[p.navKey]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t.prefs.defaultPageHint}</p>
            </div>

            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                resetPrefs();
                toast.success(t.prefs.resetDone);
              }}
            >
              <RotateCcw className="w-4 h-4" /> {t.prefs.reset}
            </Button>
          </CardContent>
        </Card>

        {/* Dashboard widgets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> {t.prefs.widgets.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t.prefs.widgets.hint}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {DASHBOARD_WIDGETS.map((w) => (
              <div key={w.key} className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">{t.prefs.widgets[w.key]}</p>
                <Switch checked={widgets[w.key]} onCheckedChange={() => toggleWidget(w.key)} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Confirm delete */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> {t.prefs.confirmDelete}
              </p>
              <p className="text-xs text-muted-foreground">{t.prefs.confirmDeleteHint}</p>
            </div>
            <Switch checked={confirmDelete} onCheckedChange={setConfirmDelete} />
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="smart" className="space-y-4 mt-4">
        {/* AI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {t.settings.ai}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t.ai.enableChat}</p>
                <p className="text-xs text-muted-foreground">{t.ai.enableChatHint}</p>
              </div>
              <Switch
                checked={enableAiChat}
                onCheckedChange={(v) => toggleSetting({ enableAiChat: v })}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t.ai.enableInsights}</p>
                <p className="text-xs text-muted-foreground">{t.ai.enableInsightsHint}</p>
              </div>
              <Switch
                checked={enableAiInsights}
                onCheckedChange={(v) => toggleSetting({ enableAiInsights: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t.ai.poweredBy}</p>
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" /> {t.settings.telegram}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t.telegram.enable}</p>
                <p className="text-xs text-muted-foreground">{t.telegram.enableHint}</p>
              </div>
              <Switch
                checked={enableTelegram}
                onCheckedChange={(v) => toggleSetting({ enableTelegram: v })}
              />
            </div>

            {enableTelegram && (
              <>
                <div className="space-y-1.5">
                  <Label>{t.telegram.botToken}</Label>
                  <Input
                    value={telegramBotToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    onBlur={saveTelegramConfig}
                    type="password"
                    placeholder={hasTelegramToken ? "•••••••••• (պահված է)" : "123456:ABC-DEF…"}
                  />
                  <p className="text-xs text-muted-foreground">{t.telegram.botTokenHint}</p>
                </div>

                <div className="space-y-1.5">
                  <Label>{t.telegram.chatId}</Label>
                  <Input
                    value={telegramChatId}
                    onChange={(e) => setChatId(e.target.value)}
                    onBlur={saveTelegramConfig}
                    placeholder="123456789"
                  />
                  <p className="text-xs text-muted-foreground">{t.telegram.chatIdHint}</p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleTestTelegram}
                  disabled={!tgConfigured || tgBusy !== null}
                >
                  {tgBusy === "test" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {tgBusy === "test" ? t.telegram.testing : t.telegram.test}
                </Button>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {t.telegram.reportSchedule}
                  </Label>
                  <Select value={reportSchedule} onValueChange={changeReportSchedule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">{t.telegram.reportOff}</SelectItem>
                      <SelectItem value="daily">{t.telegram.reportDaily}</SelectItem>
                      <SelectItem value="weekly">{t.telegram.reportWeekly}</SelectItem>
                      <SelectItem value="monthly">{t.telegram.reportMonthly}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{t.telegram.budgetAlerts}</p>
                    <p className="text-xs text-muted-foreground">{t.telegram.budgetAlertsHint}</p>
                  </div>
                  <Switch
                    checked={enableBudgetAlerts}
                    onCheckedChange={(v) => toggleSetting({ enableBudgetAlerts: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{t.telegram.txNotifications}</p>
                    <p className="text-xs text-muted-foreground">{t.telegram.txNotificationsHint}</p>
                  </div>
                  <Switch
                    checked={enableTxNotifications}
                    onCheckedChange={(v) => toggleSetting({ enableTxNotifications: v })}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> {t.telegram.dailyAiReport}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.telegram.dailyAiReportHint}</p>
                  </div>
                  <Switch
                    checked={enableDailyAiReport}
                    onCheckedChange={(v) => toggleSetting({ enableDailyAiReport: v })}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendAiReport}
                  disabled={!tgConfigured || tgBusy !== null}
                >
                  {tgBusy === "ai" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {tgBusy === "ai" ? t.telegram.sending : t.telegram.sendAiReportNow}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSendReport}
                    disabled={!tgConfigured || tgBusy !== null}
                  >
                    {tgBusy === "report" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {t.telegram.sendReportNow}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCheckBudgets}
                    disabled={!tgConfigured || tgBusy !== null}
                  >
                    {tgBusy === "alert" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    {t.telegram.checkBudgets}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4 mt-4">
        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.settings.data}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={handleExport} disabled={!exportData}>
              <Download className="w-4 h-4" /> {t.settings.exportData}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" /> {t.settings.importData}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
            <Button variant="outline" className="w-full justify-start" onClick={handleExportCsv} disabled={!exportData}>
              <Download className="w-4 h-4" /> {t.settings.exportCsv}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => csvFileRef.current?.click()}>
              <Upload className="w-4 h-4" /> {t.settings.importCsv}
            </Button>
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <p className="text-xs text-muted-foreground px-1">{t.settings.csvHint}</p>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => setClearOpen(true)}
            >
              <Trash2 className="w-4 h-4" /> {t.settings.clearData}
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3 text-muted-foreground">
            <Info className="w-4 h-4 shrink-0" />
            <p className="text-xs">
              {t.appName} · {t.appTagline}
            </p>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.clearData}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t.settings.clearWarning}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              {t.settings.clearData}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
