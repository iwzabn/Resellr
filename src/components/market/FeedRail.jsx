import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, BadgeCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FeedRail({ advert }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const startListing = (event) => {
    event.preventDefault();
    navigate({
      to: "/sell",
      search: { title: title || undefined, price: price || undefined },
    });
  };

  return (
    <aside className="space-y-4">
      {advert && (
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="mono-pill border-primary/40 text-primary">Sponsored</span>
          <p className="mt-2 text-sm font-semibold">{advert.title}</p>
          {advert.body && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{advert.body}</p>}
          {advert.target_url && (
            <a
              href={advert.target_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Learn more <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
          {advert.advertiser_name && (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {advert.advertiser_name}
            </p>
          )}
        </div>
      )}

      <form onSubmit={startListing} className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Quick listing summary
          </p>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with a name and a price. You can add photos, condition and delivery later.
        </p>
        <div className="mt-3 space-y-2.5">
          <div>
            <Label htmlFor="quick-title" className="text-xs text-muted-foreground">
              What are you selling?
            </Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nike Air Max 90 US 10"
              className="mt-1 h-10"
            />
          </div>
          <div>
            <Label htmlFor="quick-price" className="text-xs text-muted-foreground">
              Asking price (AUD)
            </Label>
            <Input
              id="quick-price"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="189"
              className="mt-1 h-10"
            />
          </div>
          <Button type="submit" className="w-full gap-1.5">
            Continue to listing <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Free membership includes 5 active listings. Premium raises the limit and unlocks deeper
          analytics.
        </p>
      </form>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Seller quick actions
        </p>
        <div className="mt-3 grid gap-2">
          <RailLink to="/my-listings" title="Manage listings" note="Pause, renew or edit any item" />
          <RailLink to="/enquiries" title="Enquiries inbox" note="Review risk intelligence before replying" />
          <RailLink to="/dashboard" title="Seller performance" note="Views, enquiries and conversion" />
        </div>
      </div>

      <div className="rounded-xl border border-primary/30 bg-accent p-4">
        <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent-foreground">
          <BadgeCheck className="h-3.5 w-3.5" /> Seller control
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          Declining an enquiry never affects your seller ranking. Approximate locations only — exact
          addresses stay private until you both agree to share them.
        </p>
        <Link to="/trust" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
          How transaction checks work →
        </Link>
      </div>
    </aside>
  );
}

function RailLink({ to, title, note }) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between gap-2 rounded-lg border border-transparent px-2 py-2 transition hover:border-border hover:bg-muted/60"
    >
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{note}</span>
      </span>
      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
    </Link>
  );
}