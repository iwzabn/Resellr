import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ListingForm } from "@/components/listing/ListingForm";
import { createListing, getMyAccount } from "@/lib/api/account";

export const Route = createFileRoute("/_authed/sell")({
  validateSearch: (search) => ({ title: search.title || undefined, price: search.price || undefined }),
  loader: () => getMyAccount(),
  component: SellPage,
  head: () => ({ meta: [{ title: "Sell an item — Resellr" }] }),
});

function SellPage() {
  const { profile, subscription, limits, usage } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const publish = useServerFn(createListing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = subscription?.plan || "free";
  const limit = subscription?.listing_limit || limits[plan] || limits.free;

  const create = async (values) => {
    setError("");
    if (values.title.trim().length < 6) {
      setError("Give the listing a clear title of at least 6 characters.");
      return;
    }
    if (!values.price || values.price <= 0) {
      setError("Enter an asking price greater than zero.");
      return;
    }
    if (!values.category_slug) {
      setError("Choose a category so buyers can find it.");
      return;
    }
    if (values.images.length === 0) {
      setError("Add at least one photo of the actual item.");
      return;
    }
    setBusy(true);
    try {
      const created = await publish({
        data: {
          title: values.title.trim(),
          description: values.description.trim(),
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
      if (created.status === "pending_review") {
        toast.success("Sent for a quick check", {
          description:
            created.note ||
            "A moderator approves new listings before they appear in the marketplace.",
        });
        navigate({ to: "/my-listings" });
        return;
      }
      toast.success("Listing published");
      navigate({ to: "/listings/$listingId", params: { listingId: created.id } });
    } catch (err) {
      setError(err?.message || "We could not publish that listing. Check the photo uploads and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mono-pill">New listing</p>
      <h1 className="mt-2 text-3xl font-extrabold">Sell an item</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {usage.active_listings} of {limit} active listings used on your {plan} plan. You can pause or
        delete listings any time, and you decide who you sell to.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Every listing passes an automatic item check before it goes live.{" "}
        <Link to="/item-check" className="font-medium text-primary hover:underline">
          Test an item first
        </Link>
        .
      </p>
      {!profile?.username && (
        <p className="mt-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Add a username and area in your profile so buyers recognise you.
        </p>
      )}
      <div className="mt-6">
        <ListingForm
          initial={{
            title: search.title || "",
            price: search.price || "",
            city: profile?.city || "",
            region: profile?.region || "",
          }}
          submitLabel="Publish listing"
          onSubmit={create}
          busy={busy}
          error={error}
          limit={limit}
          usage={usage.active_listings}
        />
      </div>
    </div>
  );
}