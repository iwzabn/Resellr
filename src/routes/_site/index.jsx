import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketHeaderBand } from "@/components/market/MarketHeaderBand";
import { MarketAnalyticsBento } from "@/components/market/MarketAnalyticsBento";
import { TrendingStrip } from "@/components/trends/TrendingStrip";
import { FeedRail } from "@/components/market/FeedRail";
import { ListingCard } from "@/components/listing/ListingCard";
import { CategoryStrip } from "@/components/listing/CategoryStrip";
import { Button } from "@/components/ui/button";
import { getHomeFeed } from "@/lib/api/marketplace";

export const Route = createFileRoute("/_site/")({
  loader: () => getHomeFeed(),
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Resellr — resell with market intelligence" },
      {
        name: "description",
        content:
          "Browse reseller listings across fashion, sneakers, electronics and collectibles. Sellers see demand, pricing and transaction risk before accepting an enquiry.",
      },
    ],
  }),
});

function HomePage() {
  const { featured, recent, categories, advert, market, trends } = Route.useLoaderData();

  return (
    <>
      <MarketHeaderBand market={market} />

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold sm:text-2xl">Featured listings</h2>
                <p className="text-sm text-muted-foreground">
                  Sponsored placements are always labelled. Listings marked demo are sample content.
                </p>
              </div>
              <Link to="/marketplace" className="text-sm font-medium text-primary hover:underline">
                See all →
              </Link>
            </div>

            {featured.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <p className="font-display text-lg font-bold">The marketplace is just opening</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  No listings are live yet. Create the first one and it appears here immediately.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/sell">List an item</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {featured.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
          <FeedRail advert={advert} />
        </div>
      </section>

      <MarketAnalyticsBento market={market} isDemo={market.includes_demo} />

      <TrendingStrip trends={trends} />

      {recent.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-extrabold">Recently listed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fresh inventory from resellers across Australia.
              </p>
            </div>
            <Link to="/marketplace" className="text-sm font-medium text-primary hover:underline">
              Open marketplace →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      <CategoryStrip categories={categories} />

      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-header px-6 py-10 text-header-foreground sm:px-10">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/50">
                For resellers
              </p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight">
                Every enquiry arrives with the evidence behind it.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
                Approximate location, arrangement details and any credible reports — clearly marked
                verified or unverified, with the gaps named. There is no score that decides for you.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to="/sell"
                className="rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                List your first item
              </Link>
              <Link
                to="/trust"
                className="rounded-lg border border-white/20 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
              >
                How risk intelligence works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}