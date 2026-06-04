"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefsStore } from "@/store/use-prefs-store";
import { t } from "@/lib/i18n";

/** Quick toggle to blur/unblur all monetary figures. */
export function PrivacyToggle() {
  const privacy = usePrefsStore((s) => s.privacy);
  const toggle = usePrefsStore((s) => s.togglePrivacy);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={privacy ? t.prefs.privacyShow : t.prefs.privacyHide}
      title={privacy ? t.prefs.privacyShow : t.prefs.privacyHide}
      className="shrink-0"
    >
      {privacy ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </Button>
  );
}
