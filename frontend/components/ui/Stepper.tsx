import { cn } from "@/lib/utils";

export function Stepper({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="space-y-2" aria-label={label}>
      <div className="flex justify-between text-sm font-semibold text-muted-foreground">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={cn("h-2 rounded-full", index < current ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}
