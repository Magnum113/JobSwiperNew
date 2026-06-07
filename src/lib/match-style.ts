export interface MatchStyle {
  stroke: string;
  text: string;
  bg: string;
  border: string;
  label: string;
  emoji: string;
}

/** Color + label for a 0–100 match score. */
export function matchStyle(score: number): MatchStyle {
  if (score >= 85)
    return {
      stroke: "#10b981",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Отличное совпадение",
      emoji: "🔥",
    };
  if (score >= 70)
    return {
      stroke: "#22c55e",
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      label: "Хорошее совпадение",
      emoji: "✨",
    };
  if (score >= 50)
    return {
      stroke: "#f59e0b",
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "Среднее совпадение",
      emoji: "👍",
    };
  if (score >= 30)
    return {
      stroke: "#fb923c",
      text: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      label: "Слабое совпадение",
      emoji: "🤔",
    };
  return {
    stroke: "#f43f5e",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    label: "Низкое совпадение",
    emoji: "❌",
  };
}
