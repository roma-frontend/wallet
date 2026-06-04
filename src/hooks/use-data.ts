"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { CurrencyCode } from "@/lib/types";

export type CategoryDoc = Doc<"categories">;
export type TransactionDoc = Doc<"transactions">;
export type BudgetDoc = Doc<"budgets">;
export type GoalDoc = Doc<"goals">;
export type RecurringDoc = Doc<"recurring">;
export type AccountDoc = Doc<"accounts">;
export type TransferDoc = Doc<"transfers">;
export type DebtDoc = Doc<"debts">;
export type { Id };

/** Current user + settings (undefined while loading, null when signed out). */
export function useMe() {
  return useQuery(api.settings.me);
}

export function useBaseCurrency(): CurrencyCode {
  const me = useMe();
  return (me?.settings?.baseCurrency as CurrencyCode) ?? "AMD";
}

export function useCategories(): CategoryDoc[] {
  return useQuery(api.categories.list) ?? [];
}

export function useTransactions(): TransactionDoc[] {
  return useQuery(api.transactions.list) ?? [];
}

export function useBudgets(): BudgetDoc[] {
  return useQuery(api.budgets.list) ?? [];
}

export function useGoals(): GoalDoc[] {
  return useQuery(api.goals.list) ?? [];
}

export function useRecurring(): RecurringDoc[] {
  return useQuery(api.recurring.list) ?? [];
}

export function useAccounts(): AccountDoc[] {
  return useQuery(api.accounts.list) ?? [];
}

export function useTransfers(): TransferDoc[] {
  return useQuery(api.accounts.listTransfers) ?? [];
}

export function useDebts(): DebtDoc[] {
  return useQuery(api.debts.list) ?? [];
}

/** Loading flags for skeleton states. */
export function useDataLoading() {
  const tx = useQuery(api.transactions.list);
  const cats = useQuery(api.categories.list);
  return tx === undefined || cats === undefined;
}

/* ── Mutations ──────────────────────────────────────────── */

export function useTransactionMutations() {
  return {
    add: useMutation(api.transactions.add),
    update: useMutation(api.transactions.update),
    remove: useMutation(api.transactions.remove),
    importCsv: useMutation(api.transactions.importCsv),
  };
}

export function useCategoryMutations() {
  return {
    add: useMutation(api.categories.add),
    update: useMutation(api.categories.update),
    remove: useMutation(api.categories.remove),
  };
}

export function useBudgetMutations() {
  return {
    upsert: useMutation(api.budgets.upsert),
    remove: useMutation(api.budgets.remove),
  };
}

export function useGoalMutations() {
  return {
    add: useMutation(api.goals.add),
    update: useMutation(api.goals.update),
    remove: useMutation(api.goals.remove),
  };
}

export function useRecurringMutations() {
  return {
    add: useMutation(api.recurring.add),
    update: useMutation(api.recurring.update),
    remove: useMutation(api.recurring.remove),
  };
}

export function useAccountMutations() {
  return {
    add: useMutation(api.accounts.add),
    update: useMutation(api.accounts.update),
    remove: useMutation(api.accounts.remove),
    addTransfer: useMutation(api.accounts.addTransfer),
    removeTransfer: useMutation(api.accounts.removeTransfer),
  };
}

export function useSettingsMutations() {
  return {
    update: useMutation(api.settings.update),
    bootstrap: useMutation(api.settings.bootstrap),
    clearData: useMutation(api.settings.clearData),
    importData: useMutation(api.settings.importData),
  };
}

export function useDebtMutations() {
  return {
    add: useMutation(api.debts.add),
    update: useMutation(api.debts.update),
    addPayment: useMutation(api.debts.addPayment),
    remove: useMutation(api.debts.remove),
  };
}

/** Upload-URL generator for receipt photos. */
export function useGenerateUploadUrl() {
  return useMutation(api.files.generateUploadUrl);
}

/** Resolve a stored receipt id to a served URL. */
export function useReceiptUrl(storageId: Id<"_storage"> | undefined) {
  return useQuery(api.files.getUrl, storageId ? { storageId } : "skip");
}

/** On-demand full data snapshot (use for JSON backup export). */
export function useExportData() {
  return useQuery(api.settings.exportData);
}

/** Telegram notification actions. */
export function useNotificationActions() {
  return {
    sendTest: useAction(api.notifications.sendTest),
    sendReport: useAction(api.notifications.sendReport),
    sendBudgetAlert: useAction(api.notifications.sendBudgetAlert),
    sendDailyAiReport: useAction(api.notifications.sendDailyAiReportNow),
  };
}
