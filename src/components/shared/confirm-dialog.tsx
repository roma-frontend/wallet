"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/store/use-confirm-store";
import { t } from "@/lib/i18n";

/** Global confirmation dialog driven by the confirm store. Mounted once. */
export function ConfirmDialog() {
  const { open, title, message, confirmLabel, destructive, respond } = useConfirmStore();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && respond(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => respond(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => respond(true)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
