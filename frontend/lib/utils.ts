import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type RiskLevel = "green" | "yellow" | "orange" | "red";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale = "en-IN") {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function getRiskColor(level: RiskLevel) {
  return {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-900 border-yellow-300",
    orange: "bg-orange-100 text-orange-900 border-orange-300",
    red: "bg-red-100 text-red-800 border-red-300",
  }[level];
}

export function severityColor(score: number, max: number) {
  const pct = score / max;
  if (pct < 0.25) return "green";
  if (pct < 0.5) return "yellow";
  if (pct < 0.75) return "orange";
  return "red";
}
