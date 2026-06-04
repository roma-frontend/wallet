"use client";

import { PageHeader } from "@/components/shared/page-header";
import { AddTransactionDialog } from "@/components/shared/add-transaction-dialog";
import { TransactionList } from "@/components/shared/transaction-list";
import { t } from "@/lib/i18n";

export default function IncomePage() {
  return (
    <div>
      <PageHeader
        title={t.income.title}
        subtitle={t.income.subtitle}
        action={
          <div className="hidden md:block">
            <AddTransactionDialog defaultType="income" label={t.income.add} />
          </div>
        }
      />
      <TransactionList type="income" />
    </div>
  );
}
