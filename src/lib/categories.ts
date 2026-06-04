import type { Category } from "./types";

/** Pleasant, accessible category colors (work in light & dark). */
export const CATEGORY_COLORS = [
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#a855f7", // purple
  "#64748b", // slate
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: "cat-food", name: "Սնունդ", icon: "utensils", color: "#f97316", type: "expense", isDefault: true },
  { id: "cat-transport", name: "Տրանսպորտ", icon: "car", color: "#3b82f6", type: "expense", isDefault: true },
  { id: "cat-housing", name: "Բնակարան", icon: "house", color: "#8b5cf6", type: "expense", isDefault: true },
  { id: "cat-utilities", name: "Կոմունալ", icon: "zap", color: "#eab308", type: "expense", isDefault: true },
  { id: "cat-fun", name: "Զվարճանք", icon: "clapperboard", color: "#ec4899", type: "expense", isDefault: true },
  { id: "cat-health", name: "Առողջություն", icon: "heartPulse", color: "#f43f5e", type: "expense", isDefault: true },
  { id: "cat-clothing", name: "Հագուստ", icon: "shirt", color: "#06b6d4", type: "expense", isDefault: true },
  { id: "cat-education", name: "Կրթություն", icon: "graduationCap", color: "#6366f1", type: "expense", isDefault: true },
  { id: "cat-comm", name: "Կապ", icon: "smartphone", color: "#14b8a6", type: "expense", isDefault: true },
  { id: "cat-cafe", name: "Սրճարան", icon: "coffee", color: "#a855f7", type: "expense", isDefault: true },
  { id: "cat-travel", name: "Ճանապարհորդություն", icon: "plane", color: "#0ea5e9", type: "expense", isDefault: true },
  { id: "cat-other-exp", name: "Այլ", icon: "ellipsis", color: "#64748b", type: "expense", isDefault: true },

  // Incomes
  { id: "cat-salary", name: "Աշխատավարձ", icon: "wallet", color: "#10b981", type: "income", isDefault: true },
  { id: "cat-bonus", name: "Բոնուս", icon: "award", color: "#84cc16", type: "income", isDefault: true },
  { id: "cat-freelance", name: "Ֆրիլանս", icon: "laptop", color: "#22c55e", type: "income", isDefault: true },
  { id: "cat-invest", name: "Ներդրումներ", icon: "trendingUp", color: "#0d9488", type: "income", isDefault: true },
  { id: "cat-gift-in", name: "Նվեր", icon: "gift", color: "#16a34a", type: "income", isDefault: true },
  { id: "cat-other-inc", name: "Այլ եկամուտ", icon: "piggyBank", color: "#65a30d", type: "income", isDefault: true },
];
