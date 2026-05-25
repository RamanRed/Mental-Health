import { cn, getRiskColor, type RiskLevel } from "@/lib/utils";

export function RiskBadge({ level, label }: { level: RiskLevel; label: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide", getRiskColor(level))}>{label}</span>;
}
