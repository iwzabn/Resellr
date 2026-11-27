import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { formatDateTime, formatPrice } from "@/lib/format";

const statusTone = {
  pending: "border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning",
  accepted: "border-primary/40 bg-primary/10 text-primary",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  info_requested: "border-border bg-muted text-muted-foreground",
  closed: "border-border bg-muted text-muted-foreground",
};

export function EnquiryCard({ enquiry, perspective = "seller" }) {
  return (
    <Link
      to="/enquiries/$enquiryId"
      params={{ enquiryId: enquiry.id }}
      className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium">{enquiry.listing_title}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {formatPrice(enquiry.listing_price, enquiry.listing_currency)} ·{" "}
            {perspective === "seller" ? enquiry.buyer_name || "Buyer" : enquiry.seller_name || "Seller"} ·{" "}
            {formatDateTime(enquiry.created_date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
              statusTone[enquiry.status] || statusTone.pending
            }`}
          >
            {enquiry.status.replace("_", " ")}
          </span>
          {perspective === "seller" && <RiskBadge level={enquiry.risk_level} confidence={enquiry.risk_confidence} />}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{enquiry.buyer_message}</p>
      {(enquiry.buyer_city || enquiry.buyer_region) && perspective === "seller" && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          Approximate area: {[enquiry.buyer_city, enquiry.buyer_region].filter(Boolean).join(", ")}
        </p>
      )}
    </Link>
  );
}