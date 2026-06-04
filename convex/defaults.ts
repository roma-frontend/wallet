/** Default categories seeded for every new user (Armenian names). */
export const DEFAULT_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
}[] = [
  // Expenses
  { name: "Սնունդ", icon: "utensils", color: "#f97316", type: "expense" },
  { name: "Տրանսպորտ", icon: "car", color: "#3b82f6", type: "expense" },
  { name: "Բնակարան", icon: "house", color: "#8b5cf6", type: "expense" },
  { name: "Կոմունալ", icon: "zap", color: "#eab308", type: "expense" },
  { name: "Զվարճանք", icon: "clapperboard", color: "#ec4899", type: "expense" },
  { name: "Առողջություն", icon: "heartPulse", color: "#f43f5e", type: "expense" },
  { name: "Հագուստ", icon: "shirt", color: "#06b6d4", type: "expense" },
  { name: "Կրթություն", icon: "graduationCap", color: "#6366f1", type: "expense" },
  { name: "Կապ", icon: "smartphone", color: "#14b8a6", type: "expense" },
  { name: "Սրճարան", icon: "coffee", color: "#a855f7", type: "expense" },
  { name: "Ճանապարհորդություն", icon: "plane", color: "#0ea5e9", type: "expense" },
  { name: "Այլ", icon: "ellipsis", color: "#64748b", type: "expense" },
  // Incomes
  { name: "Աշխատավարձ", icon: "wallet", color: "#10b981", type: "income" },
  { name: "Բոնուս", icon: "award", color: "#84cc16", type: "income" },
  { name: "Ֆրիլանս", icon: "laptop", color: "#22c55e", type: "income" },
  { name: "Ներդրումներ", icon: "trendingUp", color: "#0d9488", type: "income" },
  { name: "Նվեր", icon: "gift", color: "#16a34a", type: "income" },
  { name: "Այլ եկամուտ", icon: "piggyBank", color: "#65a30d", type: "income" },
];
