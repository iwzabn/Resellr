import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PremiumCheckoutButton } from "@/components/pricing/PremiumCheckoutButton";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_site/pricing")({
  validateSearch: (search) => ({
    checkout: typeof search?.checkout === "string" ? search.checkout : undefined,
  }),
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Membership plans — Resellr" },
      {
        name: "description",
        content: "Free membership with a 5 listing allowance, or premium at AUD $9.99 per month.",
      },
    ],
  }),
});

const FREE_FEATURES = [
  "Browse the whole marketplace",
  "5 active listings",
  "Receive customer enquiries",
  "Basic seller dashboard",
  "Basic AI transaction information",
];

const PREMIUM_FEATURES = [
  "Everything in Free",
  "50 active listings (configurable)",
  "Advanced AI analytics",
  "Detailed product demand insights",
  "Advanced listing performance",
  "Additional seller intelligence",
];

function PricingPage() {
  const { checkout } = Route.useSearch();
  const [limits, setLimits] = useState({ free: 5, premium: 50, price: 9.99 });

  useEffect(() => {
    base44.entities.PlatformSetting.list({ limit: 50 })
      .then((page) => {
        const map = new Map((page.items || []).map((row) => [row.key, row]));
        setLimits({
          free: map.get("listing_limit_free")?.number_value ?? 5,
          premium: map.get("listing_limit_premium")?.number_value ?? 50,
          price: map.get("premium_price_aud")?.number_value ?? 9.99,
        });
      })
      .catch(() => null);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="mono-pill">Memberships</p>
        <h1 className="mt-3 text-4xl font-extrabold">Start free, upgrade when you need the depth</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Selling stays free while your inventory is small. Premium raises the listing allowance and
          unlocks the full analytics suite.
        </p>
      </div>

      {checkout === "success" && (
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Payment received. Premium activates as soon as the payment provider confirms it, which is
            usually within a minute.
          </span>
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="mt-6 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          Checkout was cancelled and you have not been charged.
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Free</p>
          <p className="num mt-2 font-display text-4xl font-extrabold">$0</p>
          <p className="mt-1 text-xs text-muted-foreground">No card required</p>
          <ul className="mt-5 space-y-2">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {feature}
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm">
              <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {limits.free} active
              listings
            </li>
          </ul>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/sell">Start listing</Link>
          </Button>
        </div>

        <div className="relative rounded-2xl border-2 border-primary bg-card p-6">
          <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary-foreground">
            Premium
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Premium</p>
          <p className="num mt-2 font-display text-4xl font-extrabold">
            {formatPrice(limits.price)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/ month</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">AUD, cancel any time</p>
          <ul className="mt-5 space-y-2">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {feature}
              </li>
            ))}
          </ul>
          <PremiumCheckoutButton price={limits.price} justPaid={checkout === "success"} />
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
        Listing allowances and the premium price are configured by platform administrators. Sponsored
        placements are always labelled, and we never accept advertising for prohibited products.
      </p>
    </div>
  );
}