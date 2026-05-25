import { Flame } from "lucide-react";

export function StreakDisplay({ count, label, badges = [] }: { count: number; label: string; badges?: string[] }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-700">
        <Flame className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xl font-bold">{count} {label}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {badges.map((badge) => <span key={badge} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{badge}</span>)}
        </div>
      </div>
    </div>
  );
}
