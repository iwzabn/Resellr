import { useState } from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import {
  BadgeCheck,
  Flag,
  Loader2,
  MapPin,
  Package,
  Star,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { ListingCard } from "@/components/listing/ListingCard";
import { EnquiryDialog } from "@/components/listing/EnquiryDialog";
import { ReportDialog } from "@/components/listing/ReportDialog";
import { ReviewDialog } from "@/components/listing/ReviewDialog";
import { useAuth } from "@/lib/AuthContext";
import { getListingDetail } from "@/lib/api/marketplace";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_site/listings/$listingId")({
  // Loading this route records a view, so it must not fire on hover intent.
  preload: false,
  loader: async ({ params }) => {
    const result = await getListingDetail({ data: { listing_id: params.listingId } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.listing?.title || "Listing"} — Resellr` },
      {
        name: "description",
        content:
          loaderData?.listing?.description?.slice(0, 155) ||
          "Buy from an independent reseller on Resellr.",
      },
    ],
  }),
  component: ListingPage,
});

function ListingPage() {
  const { listing, seller, related, reviews } = Route.useLoaderData();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const isOwner = !!user?.id && (user.id === listing.seller_id || user.id === listing.created_by_id);
  const unavailable = (listing.status || "active") !== "active";
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const images = listing.images?.length ? listing.images : [];
  const sellerName = listing.seller_name || seller?.username || "Reseller";
  const ratingAverage = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length) * 10) / 10
    : null;

  const startEnquiry = () => {
    if (!isAuthenticated) {
      navigateToLogin();
      return;
    }
    setEnquiryOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <Link to="/marketplace" className="hover:text-primary">
          Marketplace
        </Link>
        <span>/</span>
        <Link to="/marketplace" search={{ category: listing.category_slug }} className="hover:text-primary">
          {listing.category_name || "Other"}
        </Link>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[4/3] bg-muted">
              {images[activeImage] ? (
                <Image
                  src={images[activeImage]}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                  fittingType="fit"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Package className="h-10 w-10" />
                </div>
              )}
              <div className="absolute left-3 top-3 flex gap-2">
                <span className="mono-pill bg-card/95">{listing.condition}</span>
                {listing.is_sponsored && (
                  <span className="mono-pill border-primary/40 bg-primary/10 text-primary">Sponsored</span>
                )}
                {listing.is_demo && <span className="mono-pill bg-card/95">Demo listing</span>}
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-2">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                      index === activeImage ? "border-primary" : "border-border"
                    }`}
                    aria-label={`Photo ${index + 1}`}
                  >
                    <Image src={image} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="mono-pill">{listing.brand || "Unbranded"}</span>
              <span className="mono-pill">
                <MapPin className="h-3 w-3" /> {listing.city || listing.region || "Australia"}
                {listing.region ? `, ${listing.region}` : ""}
              </span>
              <span className="mono-pill">Listed {formatDate(listing.created_date)}</span>
              <span className="mono-pill">{listing.views || 0} views</span>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {listing.description || "The seller has not added a description yet."}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
              <Detail label="Condition" value={listing.condition} />
              <Detail label="Stock" value={`${listing.stock ?? 1} available`} />
              <Detail label="Category" value={listing.subcategory || listing.category_name} />
              <Detail
                label="Delivery"
                value={(listing.delivery_options || []).join(", ") || "Ask the seller"}
              />
            </dl>
          </div>

          {reviews.length > 0 && (
            <div className="mt-5 rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Seller reviews
              </p>
              <ul className="mt-3 space-y-3">
                {reviews.map((review) => (
                  <li key={review.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-warning">
                        {Array.from({ length: review.rating || 0 }).map((_, index) => (
                          <Star key={index} className="h-3 w-3 fill-current" />
                        ))}
                      </span>
                      <span className="text-xs text-muted-foreground">{review.reviewer_name || "Member"}</span>
                    </div>
                    <p className="mt-1 text-sm">{review.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="num font-display text-3xl font-extrabold">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {listing.stock > 1 ? `${listing.stock} available` : "One available"} · you arrange payment
              directly with the seller
            </p>
            {unavailable ? (
              <div className="mt-4 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm">
                {isOwner
                  ? `This is your listing and it is ${listing.status}. Buyers cannot see or enquire about it until it is active again.`
                  : "This listing is no longer available. The seller has paused, sold or removed it."}
              </div>
            ) : (
              <>
                <Button className="mt-4 w-full" size="lg" onClick={startEnquiry}>
                  {isLoadingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send an enquiry"}
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {isAuthenticated
                    ? "The seller sees your message and approximate area only."
                    : "Sign in to contact this seller. Browsing stays open to everyone."}
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => (isAuthenticated ? setReportOpen(true) : navigateToLogin())}
              className="mx-auto mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <Flag className="h-3 w-3" /> Report this listing
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Seller</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-accent font-display font-bold text-accent-foreground">
                {seller?.avatar_url ? (
                  <Image src={seller.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  sellerName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{sellerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {seller?.username ? `@${seller.username}` : "Reseller"}
                  {seller?.city ? ` · ${seller.city}` : ""}
                </p>
              </div>
            </div>
            {seller?.verified_seller && (
              <p className="mt-2 inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                <BadgeCheck className="h-3 w-3" /> Verified seller
              </p>
            )}
            {ratingAverage && (
              <p className="mt-3 flex items-center gap-1.5 text-sm">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {ratingAverage} average from {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </p>
            )}
            {seller?.bio && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{seller.bio}</p>}
            <button
              type="button"
              onClick={() => (isAuthenticated ? setReviewOpen(true) : navigateToLogin())}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-medium hover:border-primary/50 hover:text-primary"
            >
              <Star className="h-3 w-3" /> Write a review
            </button>
            <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
              <Truck className="h-3.5 w-3.5 shrink-0" />
              {(listing.delivery_options || []).join(" · ") || "Ask about delivery"}
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold">More in {listing.category_name}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      )}

      <EnquiryDialog listing={listing} open={enquiryOpen} onOpenChange={setEnquiryOpen} />
      <ReviewDialog
        sellerId={listing.seller_id || listing.created_by_id}
        sellerLabel={sellerName}
        listingId={listing.id}
        open={reviewOpen}
        onOpenChange={(next) => {
          setReviewOpen(next);
          if (!next) router.invalidate();
        }}
      />
      <ReportDialog
        targetType="listing"
        targetId={listing.id}
        targetLabel={listing.title}
        open={reportOpen}
        onOpenChange={(next) => {
          setReportOpen(next);
          if (!next) router.invalidate();
        }}
      />
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
    </div>
  );
}