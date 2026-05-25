import { ShieldCheck } from "lucide-react";

export function AnonymousPill({ id, label }: { id: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-900">
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      {label} {id}
    </span>
  );
}
