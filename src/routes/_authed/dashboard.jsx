import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Eye, Inbox, Sparkles, TrendingUp } from "lucide-react";
import { StatTile } from "@/components/seller/StatTile";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { Button } from "@/components/ui/button";
import { getSellerDashboard } from "@/lib/api/account";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_authed/dashboard")({
  loader: () => getSellerDashboard(),
  component: SellerDashboard,
  head: () => ({ meta: [{ title: "Seller dashboard — Resellr" }] }),
});

function SellerDashboard() {
  const { analytics, subscription, limits } = Route.useLoaderData();
  const plan = subscription?.plan || "free";
  const limit = subscription?.listing_limit || limits.free;
  const usagePct = limit ? Math.min(100, Math.round((analytics.active_listings / limit) * 100)) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-pill">Seller workspace</p>
          <h1 className="mt-2 text-3xl font-extrabold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Views and enquiries are recorded from real activity. Confirmed sales are counted separately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/my-listings">Manage listings</Link>
          </Button>
          <Button asChild>
            <Link to="/sell">Sell an item</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active listings"
          value={`${analytics.active_listings}/${limit}`}
          note={`${analytics.paused_listings} paused`}
        />
        <StatTile
          label="Listing views"
          value={analytics.total_views.toLocaleString("en-AU")}
          note="All time across your listings"
        />
        <StatTile
          label="Enquiries"
          value={analytics.total_enquiries}
          note={
            analytics.enquiries_delta === null
              ? "First week of activity"
              : `${analytics.enquiries_delta >= 0 ? "+" : ""}${analytics.enquiries_delta}% vs previous week`
          }
          tone="primary"
        />
        <StatTile
          label="Enquiry conversion"
          value={analytics.conversion === null ? "—" : `${analytics.conversion}%`}
          note="Accepted of all enquiries received"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-display text-lg font-bold">Listing performance</h2>
            <Link to="/my-listings" className="text-xs font-medium text-primary hover:underline">
              Manage
            </Link>
          </div>
          {analytics.top_listings.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No listings yet. Once you list an item, views and enquiries appear here.
              </p>
              <Button asChild className="mt-3" size="sm">
                <Link to="/sell">Create your first listing</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-2 font-normal">Listing</th>
                    <th className="px-2 py-2 text-right font-normal">Views</th>
                    <th className="px-2 py-2 text-right font-normal">Enquiries</th>
                    <th className="px-4 py-2 text-right font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_listings.map((listing) => (
                    <tr key={listing.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <Link
                          to="/listings/$listingId"
                          params={{ listingId: listing.id }}
                          className="line-clamp-1 font-medium hover:text-primary"
                        >
                          {listing.title}
                        </Link>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatPrice(listing.price, listing.currency)}
                        </span>
                      </td>
                      <td className="num px-2 py-2.5 text-right">{listing.views || 0}</td>
                      <td className="num px-2 py-2.5 text-right">{listing.enquiry_count || 0}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="mono-pill capitalize">{listing.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Membership</h2>
              <span className="mono-pill capitalize">{plan}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {analytics.active_listings} of {limit} active listings used
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${usagePct}%` }} />
            </div>
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-bold">Category performance</h2>
            {analytics.categories.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing listed yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {analytics.categories.slice(0, 5).map((category) => (
                  <li key={category.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{category.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {category.views} views · {category.enquiries} enq
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="flex items-center gap-1.5 font-display text-lg font-bold">
            <Inbox className="h-4 w-4 text-muted-foreground" /> Recent enquiries
          </h2>
          <Link to="/enquiries" className="text-xs font-medium text-primary hover:underline">
            Open inbox
          </Link>
        </div>
        {analytics.recent_enquiries.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No enquiries yet. Buyers can only contact you once a listing is active.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {analytics.recent_enquiries.map((enquiry) => (
              <li key={enquiry.id}>
                <Link
                  to="/enquiries/$enquiryId"
                  params={{ enquiryId: enquiry.id }}
                  className="flex flex-wrap items-center gap-3 p-3 transition hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{enquiry.listing_title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {enquiry.buyer_name || "Buyer"} · {enquiry.buyer_city || enquiry.buyer_region || "area not shared"} ·{" "}
                      {enquiry.created_date ? formatDate(enquiry.created_date) : ""}
                    </p>
                  </div>
                  <RiskBadge level={enquiry.risk_level} confidence={enquiry.risk_confidence} />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/seller-analytics" icon={Sparkles} label="Your analytics" note="7, 30 and 90 day performance" />
        <QuickLink to="/analytics" icon={TrendingUp} label="Market analytics" note="Category demand and pricing" />
        <QuickLink to="/messages" icon={Inbox} label="Messages" note="All seller conversations" />
        <QuickLink to="/enquiries" icon={Eye} label="Enquiries" note="With risk intelligence" />
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, note }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </Link>
  );
}