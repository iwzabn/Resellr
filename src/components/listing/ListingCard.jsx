import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Image } from "@/components/ui/image";

const priceFormat = (value, currency) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    maximumFractionDigits: 0,
  }).format(value || 0);

export function ListingCard({ listing }) {
  const cover = listing.images?.[0] || listing.image;
  return (
    <Link
      to="/listings/$listingId"
      params={{ listingId: listing.id }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={cover}
          alt={listing.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          <span className="mono-pill bg-card/95 backdrop-blur">{listing.condition}</span>
          <div className="flex flex-col items-end gap-1">
            {listing.is_sponsored && (
              <span className="mono-pill border-primary/40 bg-primary/10 text-primary backdrop-blur">
                Sponsored
              </span>
            )}
            {listing.is_demo && <span className="mono-pill bg-card/95 backdrop-blur">Demo</span>}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="num font-display text-lg font-bold leading-none">
            {priceFormat(listing.price, listing.currency)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {listing.age_label}
          </span>
        </div>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</p>
        <p className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {[listing.city, listing.region].filter(Boolean).join(", ") || "Australia"}
          </span>
        </p>
      </div>
    </Link>
  );
}