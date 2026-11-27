import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAudit } from "@/lib/api/admin";
import { formatDate, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/listings")({
  component: AdminListings,
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "In review" },
  { value: "active", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "sold", label: "Sold" },
  { value: "removed", label: "Removed" },
];

function AdminListings() {
  const audit = useServerFn(logAudit);
  const [listings, setListings] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    base44.entities.Listing.list({ sort: "-created_date", limit: 100 })
      .then((page) => setListings(page.items || []))
      .catch(() => setListings([]));
  }, []);

  const update = async (listing, patch, action) => {
    try {
      await base44.entities.Listing.update(listing.id, patch);
      await audit({ data: { action, target_type: "listing", target_id: listing.id, detail: listing.title } });
      setListings((current) => current.map((row) => (row.id === listing.id ? { ...row, ...patch } : row)));
      toast.success("Listing updated");
    } catch (err) {
      toast.error(err?.message || "That change could not be saved.");
    }
  };

  if (!listings) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listings…
      </p>
    );
  }

  const visible = filter === "all" ? listings : listings.filter((listing) => listing.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === item.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          No listings in this state.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((listing) => (
            <li key={listing.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/listings/$listingId"
                    params={{ listingId: listing.id }}
                    className="line-clamp-1 text-sm font-medium hover:text-primary"
                  >
                    {listing.title}
                  </Link>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {formatPrice(listing.price, listing.currency)} · {listing.seller_name || "seller"} ·{" "}
                    {listing.city || "—"} · {formatDate(listing.created_date)} · {listing.status}
                    {listing.is_demo ? " · demo" : ""}
                    {listing.is_sponsored ? " · sponsored" : ""}
                  </p>
                  {listing.moderation_note ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {listing.moderation_note}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {listing.status === "pending_review" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        update(listing, { status: "active", moderation_note: "" }, "listing.approved")
                      }
                    >
                      Approve
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update(
                        listing,
                        { is_sponsored: !listing.is_sponsored },
                        listing.is_sponsored ? "listing.unsponsored" : "listing.sponsored",
                      )
                    }
                  >
                    {listing.is_sponsored ? "Unsponsor" : "Sponsor"}
                  </Button>
                  {listing.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update(listing, { status: "paused" }, "listing.paused")}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update(listing, { status: "active" }, "listing.reactivated")}
                    >
                      Reactivate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      update(
                        listing,
                        { status: "removed", moderation_note: "Removed by an administrator." },
                        "listing.removed",
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}