"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { CategoryForm } from "@/components/shared/category-form";
import {
  useCategories,
  useTransactions,
  useCategoryMutations,
  useDataLoading,
  type CategoryDoc,
} from "@/hooks/use-data";
import { getIcon } from "@/lib/icons";
import { confirmDelete } from "@/store/use-confirm-store";
import { t } from "@/lib/i18n";
import type { TransactionType } from "@/lib/types";

function CategoryCard({ category, count }: { category: CategoryDoc; count: number }) {
  const [editOpen, setEditOpen] = useState(false);
  const { remove } = useCategoryMutations();
  const Icon = getIcon(category.icon);

  const handleDelete = async () => {
    if (!(await confirmDelete())) return;
    await remove({ id: category._id });
    toast.success(t.toast.categoryDeleted);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border group hover:bg-muted/40 transition-colors">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: category.color + "20" }}
      >
        <Icon className="w-5 h-5" style={{ color: category.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">{count} {t.nav.expenses.toLowerCase()}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          aria-label={t.common.edit}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-destructive"
          aria-label={t.common.delete}
          onClick={handleDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.common.edit}</DialogTitle>
          </DialogHeader>
          <CategoryForm initial={category} onSuccess={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddCategoryButton({ type }: { type: TransactionType }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4" /> {t.category.add}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.category.add}</DialogTitle>
        </DialogHeader>
        <CategoryForm defaultType={type} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const categories = useCategories();
  const transactions = useTransactions();
  const loading = useDataLoading();

  const countFor = (id: string) => transactions.filter((tx) => tx.categoryId === id).length;
  const expense = categories.filter((c) => c.type === "expense");
  const income = categories.filter((c) => c.type === "income");

  return (
    <div>
      <PageHeader title={t.category.title} subtitle={t.category.subtitle} />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t.category.expenseCategories}</CardTitle>
              <AddCategoryButton type="expense" />
            </CardHeader>
            <CardContent>
              {expense.length === 0 ? (
                <EmptyState icon={Tag} title={t.common.noData} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {expense.map((c) => (
                    <CategoryCard key={c._id} category={c} count={countFor(c._id)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t.category.incomeCategories}</CardTitle>
              <AddCategoryButton type="income" />
            </CardHeader>
            <CardContent>
              {income.length === 0 ? (
                <EmptyState icon={Tag} title={t.common.noData} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {income.map((c) => (
                    <CategoryCard key={c._id} category={c} count={countFor(c._id)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
