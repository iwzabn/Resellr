import { createFileRoute } from "@tanstack/react-router";
import { Info, Radar, Sparkles } from "lucide-react";
import { TrendFilters } from "@/components/trends/TrendFilters";
import { TrendList } from "@/components/trends/TrendList";
import { MomentumChip, StrengthBadge } from "@/components/trends/MomentumChip";
import { getTrends } from "@/lib/api/intelligence";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_site/trends")({
  validateSearch: (search) => ({
    period: search.period ? Number(search.period) : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    country: typeof search.country === "string" ? search.country : undefined,
  }),
  loaderDeps: ({ search }) => ({
    period: search.period || 30,
    category: search.category || "",
    country: search.country || "",
  }),
  loader: ({ deps }) => getTrends({ data: deps }),
  component: TrendsPage,
  head: () => ({
    meta: [
      { title: "Market trends — Resellr" },
      {
        name: "description",
        content:
          "Emerging product, category and brand demand across the Resellr marketplace, calculated from recorded views, searches and enquiries.",
      },
    ],
  }),
});

function Card({ title, sub, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="text-xs text-muted-foreground">{sub}</p>
      {children}
    </section>
  );
}

function TrendsPage() {
  const search = Route.useSearch();
  const trends = Route.useLoaderData();
  const period = search.period || 30;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="mono-pill">
        <Radar className="h-3 w-3" /> Trend engine
      </p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">What the market is doing</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Each figure compares the last {period} days with the {period} days before it, using recorded
        listing views, searches and enquiries. Nothing here is extrapolated: where the sample is too
        small the signal is labelled as such.
      </p>

      <TrendFilters period={period} category={search.category || ""} country={search.country || ""} />

      {!trends.reliable && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          There is not enough recorded activity in this period for reliable trend statements
          ({trends.total_views} views, {trends.total_enquiries} enquiries). The figures below are raw
          counts and will become meaningful as activity builds.
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Products gaining interest" sub="Most viewed listings in this period, with change against the previous period">
          <TrendList items={trends.products} metric="views" emptyMessage="No listing views recorded in this period." />
        </Card>

        <Card title="Categories with rising demand" sub="Listing views and enquiries by category">
          <TrendList items={trends.categories} metric="views" emptyMessage="No category activity recorded yet." />
        </Card>

        <Card title="Brands attracting attention" sub="Views on listings by brand">
          <TrendList items={trends.brands} metric="views" emptyMessage="Not enough branded listings to compare." />
        </Card>

        <Card title="Most searched terms" sub="Marketplace-wide searches. Not tied to a category filter.">
          <TrendList items={trends.searches} metric="searches" emptyMessage="No searches recorded yet." />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="High interest, few listings" sub="Categories where demand is running ahead of supply">
          {trends.gaps.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No category currently has clearly more interest than supply in this period.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {trends.gaps.map((gap) => (
                <li key={gap.label} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{gap.label}</p>
                    <StrengthBadge strength={gap.signal_strength} confidence={gap.confidence} />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gap.note}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Average asking price movement" sub="Average asking price by category, compared with the previous snapshot">
          {trends.price_shifts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              A price comparison needs at least two recorded snapshots. One is being kept now, so
              movement will appear once a later snapshot exists.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {trends.price_shifts.map((row) => (
                <li key={row.label} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      now {formatPrice(row.avg_price)} · previously {formatPrice(row.previous_avg_price)}
                    </p>
                  </div>
                  <MomentumChip value={row.momentum_pct} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="mt-4 rounded-xl border border-dashed border-border bg-card p-4">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Seasonal patterns
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{trends.seasonal.note}</p>
      </section>

      <ul className="mt-4 space-y-1">
        {trends.notes.map((note) => (
          <li key={note} className="text-[11px] leading-relaxed text-muted-foreground">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}