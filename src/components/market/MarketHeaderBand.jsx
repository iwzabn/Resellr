import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleDollarSign, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketHeaderBand({ market }) {
  const topCategory = market.categories_table?.[0];
  const ticker = [
    { label: "Active listings", value: (market.live_listings ?? 0).toLocaleString("en-AU"), note: "live" },
    {
      label: "New this week",
      value: `${market.listings_new ?? 0}`,
      note: typeof market.listings_delta === "number" ? `${market.listings_delta > 0 ? "+" : ""}${market.listings_delta}%` : "no baseline",
    },
    { label: "Views · 7d", value: (market.views_this_week ?? 0).toLocaleString("en-AU"), note: "real events" },
    { label: "Enquiries · 7d", value: `${market.enquiries_this_week ?? 0}`, note: "real events" },
    { label: "Most active category", value: topCategory ? topCategory.name : "Building up", note: "by listing volume" },
  ];

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-8 pt-10 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:pt-14">
        <div>
          <p className="mono-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Live marketplace · Australia
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] sm:text-5xl">
            Resell with the numbers
            <span className="text-primary"> on your side.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            List anything permitted, reach buyers across the country, and see demand, pricing and
            transaction risk before you agree to a deal. You decide who you sell to.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/marketplace">
                Browse the marketplace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/sell">Sell an item</Link>
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <Stat icon={TrendingUp} label="Demand signal" value="Category-level" note="Measured, not guessed" />
          <Stat icon={ShieldCheck} label="Enquiry checks" value="Advisory" note="Evidence shown" />
          <Stat icon={CircleDollarSign} label="Listing fees" value="Free tier" note="AUD $9.99 premium" />
          <Stat icon={ShieldCheck} label="Your call" value="Accept or pass" note="Always seller-led" />
        </dl>
      </div>

      <div className="border-t border-border bg-header text-header-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2.5 sm:px-6">
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-white/45">
            Market ticker
          </span>
          {ticker.map((tick) => (
            <div key={tick.label} className="flex shrink-0 items-center gap-2 text-xs">
              <span className="text-white/50">{tick.label}</span>
              <span className="font-medium text-white">{tick.value}</span>
              <span className="font-mono text-[11px] text-primary/90">{tick.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </dt>
      <dd className="mt-1.5 font-display text-sm font-bold">{value}</dd>
      <dd className="text-xs text-muted-foreground">{note}</dd>
    </div>
  );
}