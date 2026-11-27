import { BentoCard } from "@/components/market/BentoCard";

export function BentoRankList({ title, sub, items = [], metricLabel, emptyText }) {
  return (
    <BentoCard title={title} sub={sub}>
      {items.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          {emptyText || "Nothing recorded yet — this fills in with real activity."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                {item.meta && <span className="block truncate text-[11px] text-muted-foreground">{item.meta}</span>}
              </span>
              {typeof item.index === "number" && (
                <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-muted sm:block">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${item.index}%` }} />
                </span>
              )}
              {item.delta && <span className="shrink-0 font-mono text-[11px] text-primary">{item.delta}</span>}
            </li>
          ))}
        </ul>
      )}
      {metricLabel && (
        <p className="mt-3 border-t border-border pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {metricLabel}
        </p>
      )}
    </BentoCard>
  );
}