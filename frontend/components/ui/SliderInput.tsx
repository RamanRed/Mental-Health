"use client";

export function SliderInput({ label, value, onChange, min = 1, max = 10 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return (
    <label className="block space-y-2">
      <span className="flex justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>{value}</span>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-3 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 accent-primary"
      />
    </label>
  );
}
