"use client";

import { cn } from "@/lib/utils";

export function ChipSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? value.filter((item) => item !== option) : [...value, option])}
              className={cn("rounded-full border px-3 py-2 text-sm font-semibold", selected ? "border-primary bg-indigo-50 text-primary" : "bg-white text-foreground")}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
