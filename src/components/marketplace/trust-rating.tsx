import { Star } from "lucide-react";

export function TrustRating({ score }: { score: number }) {
  const bounded = Math.min(5, Math.max(1, score));

  return (
    <div
      aria-label={`${bounded.toFixed(1)} out of 5 marketplace trust score. This is not a customer review average.`}
      className="mt-2 flex items-center gap-1.5 text-amber-600"
      title="Marketplace trust score, not a customer review average"
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.min(1, Math.max(0, bounded - index)) * 100;
          return (
            <span className="relative block size-3.5" key={index}>
              <Star className="absolute inset-0 size-3.5 text-stone-300" strokeWidth={2} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <Star className="size-3.5 fill-current" strokeWidth={2} />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-xs font-bold tabular-nums text-stone-700">{bounded.toFixed(1)}</span>
    </div>
  );
}
