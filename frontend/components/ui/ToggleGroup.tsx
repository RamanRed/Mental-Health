"use client";

import { cn } from "@/lib/utils";

export function ToggleGroup({ label, yes, no, value, onChange }: { label: string; yes: string; no: string; value?: boolean; onChange: (value: boolean) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[{ label: yes, value: true }, { label: no, value: false }].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={value === item.value}
            onClick={() => onChange(item.value)}
            className={cn("rounded-lg border px-3 py-3 text-sm font-semibold", value === item.value ? "border-primary bg-indigo-50 text-primary" : "bg-white")}
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
