import { BentoCard } from "@/components/market/BentoCard";

// Bar heights are shares of the busiest category, not absolute counts.
export function BentoCategoryBars({ bars = [], total = 0 }) {
  return (
    <BentoCard title="Category volume" sub="Relative listing volume">
      {bars.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">No active listings to compare yet.</p>
      ) : (
        <>
          <div className="flex h-24 items-end gap-1.5">
            {bars.map((bar) => (
              <div key={bar.name} className="flex h-full flex-1 flex-col justify-end gap-1" title={`${bar.name}: ${bar.value}%`}>
                <div
                  className="w-full rounded-sm bg-primary/85 transition-all duration-700"
                  style={{ height: `${Math.max(bar.value, 4)}%` }}
                />
                <span className="truncate text-center font-mono text-[8px] uppercase text-muted-foreground">
                  {bar.name}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Active listings
            </span>
            <span className="num font-display text-lg font-bold">{total.toLocaleString("en-AU")}</span>
          </div>
        </>
      )}
    </BentoCard>
  );
}