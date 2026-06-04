import { AppBootstrap } from "@/components/providers/app-bootstrap";
import { AppShell } from "@/components/layout/app-shell";
import { AiAssistant } from "@/components/shared/ai-assistant";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CommandPalette } from "@/components/shared/command-palette";
import { GlobalTransactionDialog } from "@/components/shared/global-transaction-dialog";
import { MobileFab } from "@/components/shared/mobile-fab";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppBootstrap>
      <AppShell>{children}</AppShell>
      <AiAssistant />
      <ConfirmDialog />
      <CommandPalette />
      <GlobalTransactionDialog />
      <MobileFab />
    </AppBootstrap>
  );
}
