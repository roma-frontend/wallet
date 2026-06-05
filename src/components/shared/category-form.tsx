"use client";

import { createElement, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategoryMutations, type CategoryDoc } from "@/hooks/use-data";
import { CATEGORY_COLORS } from "@/lib/categories";
import { ICON_KEYS, getIcon } from "@/lib/icons";
import { t } from "@/lib/i18n";
import type { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  initial?: CategoryDoc;
  defaultType?: TransactionType;
  onSuccess?: () => void;
}

export function CategoryForm({ initial, defaultType, onSuccess }: Props) {
  const { add, update } = useCategoryMutations();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<TransactionType>(initial?.type ?? defaultType ?? "expense");
  const [icon, setIcon] = useState(initial?.icon ?? "ellipsis");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t.form.nameRequired);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await update({ id: initial._id, name: name.trim(), icon, color });
        toast.success(t.toast.categoryUpdated);
      } else {
        await add({ name: name.trim(), icon, color, type });
        toast.success(t.toast.categoryAdded);
      }
      onSuccess?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {!isEdit && (
        <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <TabsList className="w-full">
            <TabsTrigger value="expense" className="flex-1">
              {t.type.expense}
            </TabsTrigger>
            <TabsTrigger value="income" className="flex-1">
              {t.type.income}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="cat-name">{t.category.name}</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.category.name}
        />
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label>{t.category.color}</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={cn(
                "w-7 h-7 rounded-lg transition-transform",
                color === c && "ring-2 ring-offset-2 ring-offset-background scale-110",
              )}
              style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
            />
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div className="space-y-2">
        <Label>{t.category.icon}</Label>
        <div className="grid grid-cols-7 gap-2 max-h-40 overflow-y-auto p-1">
          {ICON_KEYS.map((key) => {
            const iconComponent = getIcon(key);
            const active = icon === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={key}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center border transition-colors",
                  active ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                )}
              >
                {createElement(iconComponent, {
                  className: "w-4 h-4",
                  style: { color: active ? color : "var(--muted-foreground)" },
                })}
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" disabled={saving}>
        {isEdit ? t.common.save : t.common.add}
      </Button>
    </div>
  );
}
