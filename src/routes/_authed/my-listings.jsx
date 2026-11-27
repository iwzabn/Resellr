import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Pause, Pencil, Play, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate, formatPrice } from "@/lib/format";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { setListingStatus } from "@/lib/api/account";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/my-listings")({
  component: MyListingsPage,
  head: () => ({ meta: [{ title: "My listings — Resellr" }] }),
});

const FILTERS = [
  { value: "active", label: "Live" },
  { value: "pending_review", label: "In review" },
  { value: "paused", label: "Paused" },
  { value: "sold", label: "Sold" },
  { value: "all", label: "All" },
];

function MyListingsPage() {
  const { user } = useAuth();
  const changeStatus = useServerFn(setListingStatus);
  const [listings, setListings] = useState(null);
  const [filter, setFilter] = useState("active");
  const [working, setWorking] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Listing.filter({ seller_id: user.id }, { sort: "-created_date", limit: 100 })
      .then((page) => setListings(page.items || []))
      .catch(() => setListings([]));
  }, [user?.id]);

  const setStatus = async (listing, status) => {
    setWorking(listing.id);
    try {
      await changeStatus({ data: { id: listing.id, status } });
      setListings((current) =>
        current.map((item) => (item.id === listing.id ? { ...item, status } : item)),
      );
      toast.success(status === "paused" ? "Listing paused" : "Listing renewed");
    } catch (err) {
      toast.error(err?.message || "That change could not be saved.");
    } finally {
      setWorking(null);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      await base44.entities.Listing.delete(pendingDelete.id);
      setListings((current) => current.filter((item) => item.id !== pendingDelete.id));
      toast.success("Listing deleted");
    } catch {
      toast.error("That listing could not be deleted.");
    } finally {
      setPendingDelete(null);
    }
  };

  if (!listings) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your listings…
      </div>
    );
  }

  const visible = filter === "all" ? listings : listings.filter((listing) => listing.status === filter);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-pill">Seller inventory</p>
          <h1 className="mt-2 text-3xl font-extrabold">My listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pause, renew, edit or delete any of your listings. Renewing resets the listing date.
          </p>
        </div>
        <Button asChild>
          <Link to="/sell">New listing</Link>
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mt-5">
        <TabsList>
          {FILTERS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-bold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {listings.length === 0
              ? "Create your first listing to start receiving enquiries."
              : `No ${(FILTERS.find((item) => item.value === filter)?.label || filter).toLowerCase()} listings right now.`}
          </p>
          {listings.length === 0 && (
            <Button asChild className="mt-4">
              <Link to="/sell">Create a listing</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {visible.map((listing) => (
            <li
              key={listing.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {listing.images?.[0] ? (
                  <Image src={listing.images?.[0]} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to="/listings/$listingId"
                  params={{ listingId: listing.id }}
                  className="line-clamp-1 text-sm font-medium hover:text-primary"
                >
                  {listing.title}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className={listing.status === "pending_review" ? "text-warning" : ""}>
                    {LISTING_STATUS_LABELS[listing.status] || listing.status}
                  </span>
                  <span>·</span>
                  <span>{formatPrice(listing.price, listing.currency)}</span>
                  <span>·</span>
                  <span>{listing.views || 0} views</span>
                  <span>·</span>
                  <span>{listing.enquiry_count || 0} enquiries</span>
                  <span>·</span>
                  <span>{formatDate(listing.created_date)}</span>
                </p>
                {listing.status === "pending_review" && listing.moderation_note ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {listing.moderation_note}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {listing.status === "pending_review" ? (
                  <span className="mono-pill">Awaiting review</span>
                ) : listing.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(listing, "paused")}
                    disabled={working === listing.id}
                  >
                    <Pause className="mr-1 h-3.5 w-3.5" /> Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(listing, "active")}
                    disabled={working === listing.id}
                  >
                    {listing.status === "paused" ? (
                      <Play className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    )}
                    {listing.status === "paused" ? "Resume" : "Renew"}
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to="/edit/$listingId" params={{ listingId: listing.id }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setPendingDelete(listing)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be removed from the marketplace. Existing enquiries and
              conversations stay in your inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep listing</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete listing</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}