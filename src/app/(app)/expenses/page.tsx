"use client";

import { PageHeader } from "@/components/shared/page-header";
import { AddTransactionDialog } from "@/components/shared/add-transaction-dialog";
import { TransactionList } from "@/components/shared/transaction-list";
import { t } from "@/lib/i18n";

export default function ExpensesPage() {
  return (
    <div>
      <PageHeader
        title={t.expense.title}
        subtitle={t.expense.subtitle}
        action={
          <div className="hidden md:block">
            <AddTransactionDialog defaultType="expense" label={t.expense.add} />
          </div>
        }
      />
      <TransactionList type="expense" />
    </div>
  );
}
