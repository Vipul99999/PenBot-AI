import { PenLine } from 'lucide-react';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-white shadow-sm">
        <PenLine size={22} strokeWidth={2.4} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-lg font-black tracking-normal text-ink">PenBot</p>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-700">AI Notes</p>
        </div>
      )}
    </div>
  );
}
