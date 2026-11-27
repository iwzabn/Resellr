import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { ListingCard } from "@/components/listing/ListingCard";
import { FilterBar } from "@/components/marketplace/FilterBar";
import { searchListings } from "@/lib/api/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
};

// Only the values that are actually present are returned, so the URL and the
// loader's dependencies are identical on the server and in the browser.
export const Route = createFileRoute("/_site/marketplace")({
  validateSearch: (search) => {
    const next = {
      q: text(search.q),
      category: text(search.category),
      condition: text(search.condition),
      brand: text(search.brand),
      region: text(search.region),
      min: money(search.min),
      max: money(search.max),
      sort: text(search.sort),
    };
    return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
  },
  loaderDeps: ({ search }) => ({
    q: search.q,
    category: search.category,
    condition: search.condition,
    brand: search.brand,
    region: search.region,
    min: search.min,
    max: search.max,
    sort: search.sort,
  }),
  loader: ({ deps }) =>
    searchListings({
      data: {
        q: deps.q,
        category: deps.category,
        condition: deps.condition,
        brand: deps.brand,
        region: deps.region,
        min: deps.min,
        max: deps.max,
        sort: deps.sort,
      },
    }),
  component: MarketplacePage,
  head: () => ({
    meta: [
      { title: "Marketplace — Resellr" },
      {
        name: "description",
        content:
          "Browse reseller listings across Australia. Filter by category, condition, price and state.",
      },
    ],
  }),
});

function MarketplacePage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(search.q || "");
  const [extra, setExtra] = useState([]);
  const [loading, setLoading] = useState(false);
  const items = [...data.items, ...extra];

  const apply = (next) => {
    setExtra([]);
    navigate({ to: "/marketplace", search: next });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    apply({ ...search, q: term || undefined });
  };

  const loadMore = async () => {
    if (!data.next_cursor) return;
    setLoading(true);
    try {
      const page = await searchListings({
        data: { ...search, cursor: data.next_cursor },
      });
      setExtra((current) => [...current, ...page.items]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Marketplace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {search.q ? `Results for “${search.q}”` : "Everything currently listed by resellers"}
          </p>
          <Link to="/item-check" className="mt-1 inline-block text-xs font-medium text-primary hover:underline">
            Not sure something can be listed? Run the AI item check →
          </Link>
        </div>
        <form onSubmit={submitSearch} className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search listings"
              className="pl-9"
              aria-label="Search listings"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="mt-5">
        <FilterBar
          search={search}
          onApply={apply}
          resultCount={items.length}
          hasMore={data.has_more || extra.length > 0}
        />
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-bold">No listings match those filters</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Try widening the price range or clearing the category. You can also be the first to list
            something here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/sell">Sell an item</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {data.has_more && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Load more listings
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}