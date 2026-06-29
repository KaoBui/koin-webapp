// Shared, client-safe constants for categories (no server-only imports here, so
// both the picker UI and server code can import them).

export const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
  "#64748b", // slate
] as const;

export const PRESET_ICONS = [
  "🏠", // home / housing
  "🛒", // groceries
  "🚗", // transport
  "🍽️", // dining / food
  "🎬", // entertainment
  "💊", // health
  "🐷", // savings
  "💰", // income / money
  "✈️", // travel
  "📱", // bills / phone
  "🎓", // education
  "🎁", // gifts
  "🧾"
] as const;

// Defaults seeded for a user who has no categories yet.
export const DEFAULT_CATEGORIES: {
  name: string;
  color: string;
  icon: string;
}[] = [
  { name: "Housing", color: "#6366f1", icon: "🏠" },
  { name: "Groceries", color: "#22c55e", icon: "🛒" },
  { name: "Transport", color: "#0ea5e9", icon: "🚗" },
  { name: "Dining", color: "#f97316", icon: "🍽️" },
  { name: "Entertainment", color: "#a855f7", icon: "🎬" },
  { name: "Savings", color: "#14b8a6", icon: "🐷" },
  { name: "Income", color: "#84cc16", icon: "💰" },
];
