import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Info } from "lucide-react";
import { BentoHero } from "@/components/market/BentoHero";
import { BentoRankList } from "@/components/market/BentoRankList";
import { BentoDemandRadar } from "@/components/market/BentoDemandRadar";
import { BentoCategoryBars } from "@/components/market/BentoCategoryBars";
// Every figure comes from recorded marketplace activity. There is no sample
// dataset behind this component, so an empty market renders as no activity.
export function MarketAnalyticsBento({ market, isDemo = false }) {
  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
      <div className="rounded-3xl border border-border bg-card/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">Market intelligence</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Aggregate marketplace telemetry — demand, price levels and category momentum. Figures
              describe listing activity, not confirmed sales.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDemo && (
              <span className="mono-pill border-warning/40 bg-warning/10 text-foreground">
                <Info className="h-3 w-3 text-warning" /> Demonstration data
              </span>
            )}
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Full analytics <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <BentoHero listings={market.live_listings} delta={market.live_delta} share={market.enquiry_share} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <BentoRankList
            title="Popular products"
            sub="Most viewed listings in the last 30 days"
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
            title="Brand velocity"
            sub="Enquiry growth by brand, 14 days"
            items={market.brands.map((b) => ({ ...b, meta: `Velocity index ${b.index}`, delta: b.delta }))}
            metricLabel="Index relative to category average"
          />
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Insights only appear once there is enough real activity to be meaningful. Low listing
          volume never implies sales strength, and no figure here is a guarantee about any individual
          transaction.
        </p>
      </div>
    </section>
  );
}