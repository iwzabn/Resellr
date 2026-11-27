import { MomentumChip, StrengthBadge } from "@/components/trends/MomentumChip";

// Accepts an array (or a paged result) so a shape change can never blank the page.
const asRows = (value) => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
};

export function TrendList({ items, emptyMessage, metric = "views", showStrength = true }) {
  const rows = asRows(items);

  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const peak = Math.max(...rows.map((item) => item.current_count || 0), 1);

  return (
    <ul className="mt-3 space-y-2.5">
      {rows.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium capitalize">{item.label}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {(item.current_count || 0).toLocaleString("en-AU")} {metric}
                {typeof item.enquiries === "number" && item.enquiries > 0
                  ? ` · ${item.enquiries} enquiries`
                  : ""}
                {typeof item.listings === "number" ? ` · ${item.listings} live` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <MomentumChip value={item.momentum_pct} />
              {showStrength && <StrengthBadge strength={item.signal_strength} confidence={item.confidence} />}
            </div>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(4, Math.round(((item.current_count || 0) / peak) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}