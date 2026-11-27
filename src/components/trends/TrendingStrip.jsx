import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Radar } from "lucide-react";
import { MomentumChip, StrengthBadge } from "@/components/trends/MomentumChip";

export function TrendingStrip({ trends }) {
  const rows = (trends?.products || []).filter((row) => row.signal_strength !== "insufficient").slice(0, 4);

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="mono-pill">
              <Radar className="h-3 w-3" /> Trend engine
            </p>
            <h2 className="mt-2 text-xl font-extrabold sm:text-2xl">What is moving this month</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Built from recorded views and enquiries, compared with the previous 30 days. Engagement is
              not sales, and a small sample is never labelled a trend.
            </p>
          </div>
          <Link to="/trends" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            All trends <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-5">
            <p className="text-sm font-medium">Not enough activity to identify a trend yet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Trends appear once listings receive a meaningful number of views and enquiries over a
              period. {trends?.total_views || 0} views and {trends?.total_enquiries || 0} enquiries are
              recorded in the last 30 days.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((row) => (
              <Link
                key={row.ref_id || row.label}
                to="/listings/$listingId"
                params={{ listingId: row.ref_id }}
                className="group rounded-xl border border-border bg-background p-3 transition hover:border-primary/40"
              >
                <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{row.label}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {row.category_name || "Marketplace"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <MomentumChip value={row.momentum_pct} />
                  <StrengthBadge strength={row.signal_strength} confidence={row.confidence} />
                </div>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {row.current_count} views · {row.enquiries} enquiries
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}