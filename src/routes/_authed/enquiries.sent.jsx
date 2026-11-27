import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { EnquiryCard } from "@/components/enquiry/EnquiryCard";

export const Route = createFileRoute("/_authed/enquiries/sent")({
  component: SentEnquiries,
  head: () => ({ meta: [{ title: "Sent enquiries — Resellr" }] }),
});

function SentEnquiries() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Enquiry.filter({ buyer_id: user.id }, { sort: "-created_date", limit: 50 })
      .then((page) => setEnquiries(page.items || []))
      .catch(() => setEnquiries([]));
  }, [user?.id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mono-pill">Buying activity</p>
          <h1 className="mt-2 text-3xl font-extrabold">Enquiries I sent</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Follow each seller's response and keep talking in the message thread.
          </p>
        </div>
        <Link to="/enquiries" className="text-sm font-medium text-primary hover:underline">
          Received enquiries →
        </Link>
      </div>

      {enquiries === null ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : enquiries.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-bold">Nothing sent yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Find something you want and message the seller.
          </p>
          <Link to="/marketplace" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {enquiries.map((enquiry) => (
            <EnquiryCard key={enquiry.id} enquiry={enquiry} perspective="buyer" />
          ))}
        </div>
      )}
    </div>
  );
}