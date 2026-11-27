import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Info } from "lucide-react";
import { BentoHero } from "@/components/market/BentoHero";
import { BentoRankList } from "@/components/market/BentoRankList";
import { BentoDemandRadar } from "@/components/market/BentoDemandRadar";
import { BentoCategoryBars } from "@/components/market/BentoCategoryBars";
import { getMarketAnalytics } from "@/lib/api/marketplace";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_site/analytics")({
  loader: () => getMarketAnalytics(),
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Market analytics — Resellr" },
      {
        name: "description",
        content:
          "Category demand, price levels, most viewed listings and search interest across the Resellr marketplace.",
      },
    ],
  }),
});

function AnalyticsPage() {
  const market = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-pill">Market intelligence</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Marketplace analytics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Aggregate listing activity from across the marketplace. Views and enquiries are counted
            separately from confirmed sales, and a low listing count is never presented as proof that
            something sells well.
          </p>
        </div>
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Your seller analytics <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {market.includes_demo && (
        <p className="mono-pill mt-4 border-warning/40 bg-warning/10 text-foreground">
          <Info className="h-3 w-3 text-warning" /> Includes demonstration data
        </p>
      )}

      {!market.reliable && (
        <p className="mt-4 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground">
          There is not yet enough activity for reliable trends. Figures below are raw counts and will
          become meaningful as real views and enquiries accumulate.
        </p>
      )}

      <div className="mt-5">
        <BentoHero listings={market.live_listings} delta={market.listings_delta} share={market.enquiry_share} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BentoRankList
          title="Popular products"
          sub="Most viewed active listings"
          items={market.popular}
          metricLabel="Views and enquiries, not sales"
        />
        <BentoDemandRadar
          points={market.radar}
          now={market.demand_now}
          peak={market.demand_peak}
          change={market.demand_change}
        />
        <BentoCategoryBars bars={market.category_bars} total={market.live_listings} />
        <BentoRankList
          title="Popular brands"
          sub="Active listings per brand"
          items={market.brands}
          metricLabel="Listing volume, not sales performance"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Most searched</h2>
          {market.searches.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No search activity recorded yet. Searches on this site are counted to show what buyers
              are looking for.
            </p>
          ) : (
            <ol className="mt-2 divide-y divide-border">
              {market.searches.map((row) => (
                <li key={row.term} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">{row.term}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {row.count} searches
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <BentoRankList
          title="Products with the most enquiries"
          sub="Active listings ranked by enquiries received"
          items={market.most_enquired}
          metricLabel="Enquiries received, not completed sales"
        />

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Regional demand</h2>
          <p className="text-xs text-muted-foreground">
            Aggregated counts only — never the location of an individual member.
          </p>
          {market.regions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No regional activity recorded yet. Regions come from listing locations and the
              approximate areas buyers choose to share.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {market.regions.map((row) => (
                <li key={row.label} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {row.listings} listed · {row.enquiries} enquiries
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Category price levels</h2>
          {market.categories_table.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[300px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 font-normal">Category</th>
                    <th className="py-2 text-right font-normal">Listings</th>
                    <th className="py-2 text-right font-normal">Avg price</th>
                  </tr>
                </thead>
                <tbody>
                  {market.categories_table.map((row) => (
                    <tr key={row.name} className="border-b border-border last:border-0">
                      <td className="py-2">{row.name}</td>
                      <td className="num py-2 text-right">{row.listings}</td>
                      <td className="num py-2 text-right">
                        {row.avg_price ? formatPrice(row.avg_price) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="mt-5 max-w-3xl text-[11px] leading-relaxed text-muted-foreground">
        Average prices are calculated from currently active asking prices, not from completed sales.
        Demand changes compare enquiries in the last seven days with the seven before. Where a
        comparison has no baseline, we show nothing rather than an invented trend.
      </p>
    </div>
  );
}