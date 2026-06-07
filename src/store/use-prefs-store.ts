import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Visual / device-local preferences (separate from synced Convex settings). */
export type AccentKey = "emerald" | "ocean" | "violet" | "rose" | "amber" | "teal";
export type Density = "comfortable" | "compact";

/** Selectable accent themes — swatch is the light-mode primary for the picker UI. */
export const ACCENTS: { key: AccentKey; label: string; swatch: string; favicon: string; faviconDark: string }[] = [
  { key: "emerald", label: "Զմրուխտ", swatch: "oklch(0.62 0.14 165)", favicon: "#00a071", faviconDark: "#008356" },
  { key: "ocean", label: "Ովկիան", swatch: "oklch(0.6 0.16 245)", favicon: "#0086d8", faviconDark: "#006aba" },
  { key: "violet", label: "Մանուշակ", swatch: "oklch(0.58 0.18 295)", favicon: "#855dd7", faviconDark: "#6c42ba" },
  { key: "rose", label: "Վարդագույն", swatch: "oklch(0.55 0.23 18)", favicon: "#d7003a", faviconDark: "#b90023" },
  { key: "amber", label: "Սաթ", swatch: "oklch(0.7 0.16 70)", favicon: "#dc8900", faviconDark: "#b96900" },
  { key: "teal", label: "Փիրուզ", swatch: "oklch(0.62 0.13 195)", favicon: "#009d9e", faviconDark: "#008082" },
];

/** Pages the user can pick as the default landing screen. `navKey` indexes t.nav. */
export const LANDING_PAGES: { value: string; navKey: "dashboard" | "income" | "expenses" | "budgets" | "analytics" }[] = [
  { value: "/", navKey: "dashboard" },
  { value: "/income", navKey: "income" },
  { value: "/expenses", navKey: "expenses" },
  { value: "/budgets", navKey: "budgets" },
  { value: "/analytics", navKey: "analytics" },
];

/** Toggleable dashboard sections. `labelKey` indexes t.prefs.widgets. */
export type WidgetKey = "balance" | "stats" | "charts" | "recent" | "topCategories";
export const DASHBOARD_WIDGETS: { key: WidgetKey }[] = [
  { key: "balance" },
  { key: "stats" },
  { key: "charts" },
  { key: "recent" },
  { key: "topCategories" },
];

interface PrefsState {
  accent: AccentKey;
  density: Density;
  privacy: boolean;
  defaultPage: string;
  /** Visible dashboard sections. */
  widgets: Record<WidgetKey, boolean>;
  /** Ask for confirmation before deleting anything. */
  confirmDelete: boolean;
  setAccent: (a: AccentKey) => void;
  setDensity: (d: Density) => void;
  setPrivacy: (v: boolean) => void;
  togglePrivacy: () => void;
  setDefaultPage: (p: string) => void;
  toggleWidget: (k: WidgetKey) => void;
  setConfirmDelete: (v: boolean) => void;
  reset: () => void;
}

const DEFAULT_WIDGETS: Record<WidgetKey, boolean> = {
  balance: true,
  stats: true,
  charts: true,
  recent: true,
  topCategories: true,
};

const DEFAULTS = {
  accent: "emerald" as AccentKey,
  density: "comfortable" as Density,
  privacy: false,
  defaultPage: "/",
  widgets: DEFAULT_WIDGETS,
  confirmDelete: true,
};

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      setPrivacy: (privacy) => set({ privacy }),
      togglePrivacy: () => set((s) => ({ privacy: !s.privacy })),
      setDefaultPage: (defaultPage) => set({ defaultPage }),
      toggleWidget: (k) =>
        set((s) => ({ widgets: { ...s.widgets, [k]: !s.widgets[k] } })),
      setConfirmDelete: (confirmDelete) => set({ confirmDelete }),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: "dramapanak-prefs",
      // Merge persisted state so newly-added widget keys keep their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PrefsState>;
        return {
          ...current,
          ...p,
          widgets: { ...DEFAULT_WIDGETS, ...(p.widgets ?? {}) },
        };
      },
    },
  ),
);
