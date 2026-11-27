import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Eye, Inbox, Info, Sparkles } from "lucide-react";
import { StatTile } from "@/components/seller/StatTile";
import { PeriodTabs } from "@/components/seller/PeriodTabs";
import { ViewsChart } from "@/components/seller/ViewsChart";
import { RecommendationList } from "@/components/seller/RecommendationList";
import { getSellerInsights } from "@/lib/api/intelligence";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_authed/seller-analytics")({
  validateSearch: (search) => ({
    period: search.period ? Number(search.period) : undefined,
  }),
  loaderDeps: ({ search }) => ({ period: search.period || 30 }),
  loader: ({ deps }) => getSellerInsights({ data: { period: deps.period } }),
  component: SellerInsightsPage,
  head: () => ({ meta: [{ title: "Seller analytics — Resellr" }] }),
});

function SellerInsightsPage() {
  const insights = Route.useLoaderData();
  const { period } = Route.useSearch();
  const current = insights.current;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-pill">
            <Sparkles className="h-3 w-3" /> Seller intelligence
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">Your analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every figure is counted from your own listings, views and enquiries. Suggestions are based
            on that data and marked as estimates where they involve a comparison.
          </p>
        </div>
        <PeriodTabs period={period || 30} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active listings"
          value={`${insights.active_listings}/${insights.total_listings}`}
          note={`${insights.paused_listings} paused · ${insights.sold_listings} sold`}
        />
        <StatTile
          label={`Views (${current.days}d)`}
          value={current.views.toLocaleString("en-AU")}
          note={`${insights.total_views.toLocaleString("en-AU")} all time`}
        />
        <StatTile
          label={`Enquiries (${current.days}d)`}
          value={current.enquiries}
          note={`${current.accepted} accepted · ${insights.total_enquiries} all time`}
          tone="primary"
        />
        <StatTile
          label="Conversion"
          value={current.conversion_pct === null ? "—" : `${current.conversion_pct}%`}
          note="Accepted enquiries ÷ enquiries received"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Listing views</h2>
              <p className="text-xs text-muted-foreground">Daily views over the last {Math.min(current.days, 30)} days</p>
            </div>
            <Link to="/my-listings" className="text-xs font-medium text-primary hover:underline">
              Manage listings
            </Link>
          </div>
          <div className="mt-3">
            <ViewsChart data={insights.daily} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Period comparison</h2>
          <p className="text-xs text-muted-foreground">The same measures across each window</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2 font-normal">Window</th>
                <th className="py-2 text-right font-normal">Views</th>
                <th className="py-2 text-right font-normal">Enq</th>
                <th className="py-2 text-right font-normal">Acc</th>
                <th className="py-2 text-right font-normal">Conv</th>
              </tr>
            </thead>
            <tbody>
              {insights.windows.map((row) => (
                <tr key={row.days} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{row.days}d</td>
                  <td className="num py-2 text-right">{row.views}</td>
                  <td className="num py-2 text-right">{row.enquiries}</td>
                  <td className="num py-2 text-right">{row.accepted}</td>
                  <td className="num py-2 text-right">{row.conversion_pct === null ? "—" : `${row.conversion_pct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 rounded-lg bg-muted/60 p-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Average asking price
            </p>
            <p className="num mt-0.5 text-lg font-bold">
              {insights.avg_listing_price === null ? "—" : formatPrice(insights.avg_listing_price)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Average of your active listings, not of completed sales.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-bold">Most viewed listings</h2>
            <p className="text-xs text-muted-foreground">Ranked by recorded views, all time</p>
          </div>
          {insights.top_listings.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {insights.top_listings.map((listing) => (
                <li key={listing.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/listings/$listingId"
                      params={{ listingId: listing.id }}
                      className="line-clamp-1 text-sm font-medium hover:text-primary"
                    >
                      {listing.title}
                    </Link>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatPrice(listing.price, listing.currency)} · {listing.status}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" /> {listing.views}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Inbox className="h-3 w-3" /> {listing.enquiries}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Improvement suggestions</h2>
          <p className="text-xs text-muted-foreground">
            Data-based, never a promise of results. Dismiss any that do not fit.
          </p>
          <RecommendationList recommendations={insights.recommendations} />
        </section>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {insights.completed_sales_note}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickLink to="/dashboard" label="Seller dashboard" note="Membership and inbox" />
        <QuickLink to="/trends" label="Market trends" note="Where demand is moving" />
        <QuickLink to="/enquiries" label="Enquiries" note="With risk intelligence" />
      </div>
    </div>
  );
}

function QuickLink({ to, label, note }) {
  return (
    <Link to={to} className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
      <p className="flex items-center gap-1 text-sm font-medium">
        {label} <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
      </p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </Link>
  );
}