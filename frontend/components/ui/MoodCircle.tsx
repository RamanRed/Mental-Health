import { cn } from "@/lib/utils";

export function MoodCircle({ value, label, className }: { value: number; label: string; className?: string }) {
  const bounded = Math.max(1, Math.min(10, value));
  const pct = bounded / 10;
  const hue = 8 + pct * 135;
  const dash = 2 * Math.PI * 42 * pct;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} aria-label={`${label}: ${bounded} / 10`}>
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" role="img" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke={`hsl(var(--border))`} strokeWidth="9" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={`hsl(${hue} 72% 44%)`} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} 264`} />
      </svg>
      <span className="absolute text-2xl font-bold text-foreground">{bounded}</span>
    </div>
  );
}
