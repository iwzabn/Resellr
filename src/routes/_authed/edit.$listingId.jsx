import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListingForm } from "@/components/listing/ListingForm";
import { updateListing } from "@/lib/api/account";

export const Route = createFileRoute("/_authed/edit/$listingId")({
  component: EditListingPage,
  head: () => ({ meta: [{ title: "Edit listing — Resellr" }] }),
});

function EditListingPage() {
  const { listingId } = useParams({ from: "/_authed/edit/$listingId" });
  const navigate = useNavigate();
  const saveListing = useServerFn(updateListing);
  const [listing, setListing] = useState(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.entities.Listing.get(listingId)
      .then((record) => setListing(record))
      .catch(() => setMissing(true));
  }, [listingId]);

  const save = async (values) => {
    setError("");
    if (values.title.trim().length < 6 || !values.price || values.images.length === 0) {
      setError("Keep a title of 6+ characters, a price above zero and at least one photo.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveListing({
        data: {
          id: listingId,
          title: values.title.trim(),
          description: values.description,
          images: values.images,
          price: values.price,
          category_slug: values.category_slug,
          category_name: values.category_name,
          subcategory: values.subcategory,
          condition: values.condition,
          brand: values.brand,
          stock: values.stock,
          delivery_options: values.delivery_options,
          city: values.city,
          region: values.region,
        },
      });
      if (saved?.status === "pending_review") {
        toast.success("Saved and sent for a quick check", {
          description:
            saved.note || "A moderator approves this listing before it appears in the marketplace.",
        });
      } else {
        toast.success("Listing updated");
      }
      navigate({ to: "/my-listings" });
    } catch (err) {
      setError(err?.message || "That update could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Listing not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed, or it belongs to another seller.
        </p>
        <Link to="/my-listings" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to my listings
        </Link>
      </div>
    );
  }

  if (!listing) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">Loading listing…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mono-pill">Editing</p>
      <h1 className="mt-2 text-3xl font-extrabold">{listing.title}</h1>
      <div className="mt-6">
        <ListingForm
          initial={{
            ...listing,
            price: String(listing.price ?? ""),
            stock: String(listing.stock ?? 1),
            images: listing.images || [],
            delivery_options: listing.delivery_options || [],
          }}
          submitLabel="Save changes"
          onSubmit={save}
          busy={busy}
          error={error}
        />
      </div>
    </div>
  );
}