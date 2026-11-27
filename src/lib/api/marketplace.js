import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildMarketPulse, buildSellerAnalytics, emptyPulse } from "@/lib/market.server";
import { computeTrends, emptyTrends } from "@/lib/trends.server";
import { requireUser } from "@/lib/auth-middleware";

const cleanListing = (listing) => listing;

// Search text is matched literally: a crafted pattern can neither widen the query
// nor make the database work harder than a plain word search.
const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const withAge = (listing) => ({
  ...cleanListing(listing),
  age_label: listing.created_date
    ? new Date(listing.created_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : "new",
});

// A listing's view is counted at most once per half hour, so refreshing a page
// cannot inflate the count or write a record per request. If the recent-activity
// read fails, nothing is recorded.
const VIEW_WINDOW_MS = 30 * 60 * 1000;

const logListingView = async (service, listing) => {
  if (!listing || listing.status !== "active") return;
  const recent = await service.entities.AnalyticsEvent
    .filter(
      {
        event_type: "listing_view",
        listing_id: listing.id,
        created_date: { $gte: new Date(Date.now() - VIEW_WINDOW_MS).toISOString() },
      },
      { limit: 1 },
    )
    .catch(() => ({ items: [{}] }));
  if (recent.items?.length) return;
  await service.entities.AnalyticsEvent.create({
    event_type: "listing_view",
    listing_id: listing.id,
    category_slug: listing.category_slug,
    category_name: listing.category_name,
    brand: listing.brand,
    seller_id: listing.seller_id,
    region: listing.region,
    is_demo: !!listing.is_demo,
  });
  await service.entities.Listing.update(listing.id, { views: (listing.views || 0) + 1 });
};

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  try {
  const service = context.getBase44().asServiceRole;
  const sponsored = await service.entities.Listing.filter(
    { status: "active", is_sponsored: true },
    { limit: 2, sort: "-created_date" },
  );
  const recent = await service.entities.Listing.filter(
    { status: "active" },
    { limit: 16, sort: "-created_date" },
  );
  const pool = [...(sponsored.items || []), ...(recent.items || [])];
  const seen = new Set();
  const unique = pool.filter((listing) => {
    if (seen.has(listing.id)) return false;
    seen.add(listing.id);
    return true;
  });

  // Only the seller's stated city and state are shown. No distance figure is
  // derived, because the platform has no location data to compute one from.
  const prepared = unique.map(withAge);

  const categoryPage = await service.entities.Category
    .filter({ is_active: true }, { sort: "sort_order", limit: 60 })
    .catch(() => ({ items: [] }));

  const advertPage = await service.entities.Advertisement
    .filter({ status: "active" }, { limit: 1 })
    .catch(() => ({ items: [] }));

  return {
    featured: prepared.slice(0, 4),
    recent: prepared.slice(4, 12),
    categories: (categoryPage.items || []).map((category) => ({
      slug: category.slug,
      name: category.name,
      icon: category.icon,
    })),
    advert: advertPage.items?.[0] || null,
    // Read only: a public page visit never writes a trend snapshot.
    market: await buildMarketPulse(service),
    trends: await computeTrends(service, { period: 30, persist: false }),
  };
  } catch {
    // The marketplace always renders: if the aggregate read is unavailable the
    // page shows honest empty states rather than an error screen.
    return {
      featured: [],
      recent: [],
      categories: [],
      advert: null,
      market: emptyPulse(),
      trends: emptyTrends(30),
    };
  }
});

export const searchListings = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().max(120).optional(),
      category: z.string().max(60).optional(),
      condition: z.string().max(40).optional(),
      brand: z.string().max(60).optional(),
      region: z.string().max(60).optional(),
      min: z.number().min(0).max(1000000).optional(),
      max: z.number().min(0).max(1000000).optional(),
      sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).optional(),
      cursor: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const query = { status: "active" };
    if (data.category) query.category_slug = data.category;
    if (data.condition) query.condition = data.condition;
    if (data.brand) query.brand = data.brand;
    if (data.region) query.region = data.region;
    if (data.q && data.q.trim()) {
      const term = literal(data.q.trim());
      query.$or = [
        { title: { $regex: term, $options: "i" } },
        { brand: { $regex: term, $options: "i" } },
        { subcategory: { $regex: term, $options: "i" } },
      ];
    }
    if (data.min !== undefined || data.max !== undefined) {
      query.price = {};
      if (data.min !== undefined) query.price.$gte = data.min;
      if (data.max !== undefined) query.price.$lte = data.max;
    }
    const sortBy = {
      newest: "-created_date",
      price_asc: "price",
      price_desc: "-price",
      popular: "-views",
    }[data.sort || "newest"];

    const page = await service.entities.Listing.filter(query, {
      sort: sortBy,
      limit: 24,
      ...(data.cursor ? { cursor: data.cursor } : {}),
    });

    // A first-page keyword search is recorded here so guests' searches still feed
    // the trends without a separate unauthenticated write endpoint.
    if (data.q && data.q.trim().length >= 2 && !data.cursor) {
      const term = data.q.trim().toLowerCase();
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [recent, lastHour] = await Promise.all([
        service.entities.AnalyticsEvent
          .filter(
            {
              event_type: "search",
              search_term: term,
              created_date: { $gte: new Date(Date.now() - 60 * 1000).toISOString() },
            },
            { limit: 1 },
          )
          .catch(() => ({ items: [{}] })),
        service.entities.AnalyticsEvent
          .count({ event_type: "search", created_date: { $gte: hourAgo } })
          .catch(() => 0),
      ]);
      // The same term is recorded once a minute, and all search records together
      // are capped per hour, so the search counts the trends read stay meaningful.
      if (!recent.items?.length && lastHour < 120) {
        await service.entities.AnalyticsEvent.create({
          event_type: "search",
          search_term: term,
          category_slug: data.category,
        }).catch(() => null);
      }
    }

    return {
      items: (page.items || []).map(withAge),
      has_more: !!page.has_more,
      next_cursor: page.next_cursor || null,
    };
  });

export const getListingDetail = createServerFn({ method: "GET" })
  .validator(z.object({ listing_id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    // Read as the visitor first: access rules decide whether this listing may be
    // seen at all, so a listing held for review stays hidden from the public.
    const visible = await context
      .getBase44()
      .entities.Listing.get(data.listing_id)
      .catch(() => null);
    if (!visible) return null;

    const service = context.getBase44().asServiceRole;
    const listing = visible;

    const [sellerProfile, related] = await Promise.all([
      listing.created_by_id
        ? service.entities.UserProfile
            .filter({ user_id: listing.created_by_id }, { limit: 1 })
            .then((page) => page.items?.[0] || null)
            .catch(() => null)
        : null,
      service.entities.Listing
        .filter({ status: "active", category_slug: listing.category_slug, id: { $ne: listing.id } }, { limit: 4 })
        .catch(() => ({ items: [] })),
    ]);

    const reviews = listing.created_by_id
      ? await service.entities.Review
          .filter({ subject_user_id: listing.created_by_id, status: "published" }, { limit: 5 })
          .catch(() => ({ items: [] }))
      : { items: [] };

    await logListingView(service, listing).catch(() => null);

    return {
      listing: cleanListing(listing),
      seller: sellerProfile,
      related: (related.items || []).map(withAge),
      reviews: reviews.items || [],
    };
  });

export const getMarketAnalytics = createServerFn({ method: "GET" }).handler(async ({ context }) => {
  const service = context.getBase44().asServiceRole;
  try {
    return await buildMarketPulse(service);
  } catch {
    return emptyPulse();
  }
});

export const getSellerAnalytics = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    return buildSellerAnalytics(service, context.user.id);
  });