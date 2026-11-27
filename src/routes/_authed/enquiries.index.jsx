import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { EnquiryCard } from "@/components/enquiry/EnquiryCard";

export const Route = createFileRoute("/_authed/enquiries/")({
  component: ReceivedEnquiries,
  head: () => ({ meta: [{ title: "Enquiries — Resellr" }] }),
});

function ReceivedEnquiries() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Enquiry.filter({ seller_id: user.id }, { sort: "-created_date", limit: 50 })
      .then((page) => setEnquiries(page.items || []))
      .catch(() => setEnquiries([]));
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mono-pill">Seller inbox</p>
          <h1 className="mt-2 text-3xl font-extrabold">Enquiries</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Each one arrives with the buyer's approximate area and an evidence-based risk summary.
            Declining an enquiry never affects your ranking.
          </p>
        </div>
        <Link to="/enquiries/sent" className="text-sm font-medium text-primary hover:underline">
          Enquiries I sent →
        </Link>
      </div>

      {enquiries === null ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading enquiries…
        </p>
      ) : enquiries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-bold">No enquiries yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Buyers can contact you once a listing is active. Clear photos and an honest condition note
            help.
          </p>
          <Link to="/my-listings" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Review your listings
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {enquiries.map((enquiry) => (
            <EnquiryCard key={enquiry.id} enquiry={enquiry} perspective="seller" />
          ))}
        </div>
      )}
    </div>
  );
}