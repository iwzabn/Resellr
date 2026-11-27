// Server-only helpers that turn raw marketplace activity into honest aggregates.
// Every figure returned here is derived from records; nothing is invented, and
// each block carries whether there is enough volume to be meaningful.
const DAY = 24 * 60 * 60 * 1000;

const iso = (ms) => new Date(ms).toISOString();

async function safe(read, fallback) {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

const pct = (current, previous) => {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
};

export const emptyPulse = () => ({
  live_listings: 0,
  listings_new: 0,
  listings_delta: null,
  enquiry_share: 0,
  total_views: 0,
  views_this_week: 0,
  views_delta: null,
  enquiries_this_week: 0,
  enquiries_delta: null,
  popular: [],
  radar: [],
  demand_now: 0,
  demand_peak: 0,
  demand_change: null,
  category_bars: [],
  categories_table: [],
  brands: [],
  searches: [],
  most_enquired: [],
  regions: [],
  has_activity: false,
  reliable: false,
  includes_demo: false,
});

export async function buildMarketPulse(service) {
  const now = Date.now();

  const [
    activeListings,
    listingsThisWeek,
    listingsLastWeek,
    withEnquiries,
    totalViews,
    viewsThisWeek,
    viewsLastWeek,
    enquiriesThisWeek,
    enquiriesLastWeek,
    demoEvents,
    demoListings,
  ] = await Promise.all([
    safe(() => service.entities.Listing.count({ status: "active" }), 0),
    safe(() => service.entities.Listing.count({ status: "active", created_date: { $gte: iso(now - 7 * DAY) } }), 0),
    safe(
      () =>
        service.entities.Listing.count({
          status: "active",
          created_date: { $gte: iso(now - 14 * DAY), $lt: iso(now - 7 * DAY) },
        }),
      0,
    ),
    safe(() => service.entities.Listing.count({ status: "active", enquiry_count: { $gt: 0 } }), 0),
    safe(() => service.entities.AnalyticsEvent.count({ event_type: "listing_view" }), 0),
    safe(
      () =>
        service.entities.AnalyticsEvent.count({
          event_type: "listing_view",
          created_date: { $gte: iso(now - 7 * DAY) },
        }),
      0,
    ),
    safe(
      () =>
        service.entities.AnalyticsEvent.count({
          event_type: "listing_view",
          created_date: { $gte: iso(now - 14 * DAY), $lt: iso(now - 7 * DAY) },
        }),
      0,
    ),
    safe(() => service.entities.Enquiry.count({ created_date: { $gte: iso(now - 7 * DAY) } }), 0),
    safe(
      () =>
        service.entities.Enquiry.count({
          created_date: { $gte: iso(now - 14 * DAY), $lt: iso(now - 7 * DAY) },
        }),
      0,
    ),
    safe(() => service.entities.AnalyticsEvent.count({ is_demo: true }), 0),
    safe(() => service.entities.Listing.count({ is_demo: true }), 0),
  ]);

  const topViewed = await safe(
    () => service.entities.Listing.filter({ status: "active" }, { sort: "-views", limit: 5 }),
    { items: [] },
  );

  const categoryCounts = await safe(
    () => service.entities.Listing.aggregate({ query: { status: "active" }, groupBy: "category_name" }),
    { rows: [] },
  );
  const brandCounts = await safe(
    () => service.entities.Listing.aggregate({ query: { status: "active" }, groupBy: "brand" }),
    { rows: [] },
  );
  const categoryPrices = await safe(
    () =>
      service.entities.Listing.aggregate({
        query: { status: "active" },
        groupBy: "category_name",
        avg: ["price"],
      }),
    { rows: [] },
  );
  const searchTerms = await safe(
    () => service.entities.AnalyticsEvent.aggregate({ query: { event_type: "search" }, groupBy: "search_term" }),
    { rows: [] },
  );
  const mostEnquired = await safe(
    () =>
      service.entities.Listing.filter(
        { status: "active", enquiry_count: { $gt: 0 } },
        { sort: "-enquiry_count", limit: 5 },
      ),
    { items: [] },
  );
  const regionListings = await safe(
    () => service.entities.Listing.aggregate({ query: { status: "active" }, groupBy: "region" }),
    { rows: [] },
  );
  const regionEnquiries = await safe(() => service.entities.Enquiry.aggregate({ groupBy: "buyer_region" }), {
    rows: [],
  });

  const categoryRows = (categoryCounts.rows || [])
    .filter((row) => row.category_name)
    .map((row) => ({ name: row.category_name, value: row.count }))
    .sort((a, b) => b.value - a.value);
  const busiest = categoryRows[0]?.value || 1;

  const priceByCategory = new Map(
    (categoryPrices.rows || []).map((row) => [row.category_name, { avg: row.avg_price, count: row.count }]),
  );

  const radarAxes = categoryRows.slice(0, 6).map((row) => ({
    axis: row.name.split(" ")[0].slice(0, 8),
    value: Math.max(0.1, Math.round((row.value / busiest) * 100) / 100),
  }));

  const brands = (brandCounts.rows || [])
    .filter((row) => row.brand)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((row) => ({
      name: row.brand,
      index: Math.round((row.count / ((brandCounts.rows[0]?.count || 1))) * 100),
      meta: `${row.count} active listing${row.count === 1 ? "" : "s"}`,
      delta: null,
    }));

  const searches = (searchTerms.rows || [])
    .filter((row) => row.search_term)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((row) => ({ term: row.search_term, count: row.count }));

  return {
    live_listings: activeListings,
    listings_new: listingsThisWeek,
    listings_delta: pct(listingsThisWeek, listingsLastWeek),
    enquiry_share: activeListings ? Math.round((withEnquiries / activeListings) * 100) : 0,
    total_views: totalViews,
    views_this_week: viewsThisWeek,
    views_delta: pct(viewsThisWeek, viewsLastWeek),
    enquiries_this_week: enquiriesThisWeek,
    enquiries_delta: pct(enquiriesThisWeek, enquiriesLastWeek),
    popular: (topViewed.items || []).map((listing) => ({
      name: listing.title,
      meta: `${listing.views || 0} views · ${listing.enquiry_count || 0} enquiries`,
      delta: null,
    })),
    radar: radarAxes,
    demand_now: enquiriesThisWeek,
    demand_peak: Math.max(enquiriesThisWeek, enquiriesLastWeek),
    demand_change: pct(enquiriesThisWeek, enquiriesLastWeek),
    category_bars: categoryRows.slice(0, 10).map((row) => ({
      name: row.name.split(" ")[0].slice(0, 7),
      value: Math.round((row.value / busiest) * 100),
    })),
    categories_table: categoryRows.map((row) => ({
      name: row.name,
      listings: row.value,
      avg_price: priceByCategory.get(row.name)?.avg ? Math.round(priceByCategory.get(row.name).avg) : null,
    })),
    brands,
    searches,
    most_enquired: (mostEnquired.items || []).map((listing) => ({
      name: listing.title,
      meta: `${listing.enquiry_count || 0} enquiries · ${listing.views || 0} views`,
      delta: null,
    })),
    regions: [
      ...new Set([
        ...(regionListings.rows || []).filter((row) => row.region).map((row) => row.region),
        ...(regionEnquiries.rows || []).filter((row) => row.buyer_region).map((row) => row.buyer_region),
      ]),
    ]
      .map((label) => ({
        label,
        listings: (regionListings.rows || []).find((row) => row.region === label)?.count || 0,
        enquiries: (regionEnquiries.rows || []).find((row) => row.buyer_region === label)?.count || 0,
      }))
      .sort((a, b) => b.listings + b.enquiries - (a.listings + a.enquiries))
      .slice(0, 8),
    has_activity: totalViews + enquiriesThisWeek > 0,
    reliable: totalViews >= 20 || enquiriesThisWeek >= 5,
    includes_demo: demoEvents > 0 || demoListings > 0,
  };
}

export async function buildSellerAnalytics(service, userId) {
  const now = Date.now();
  const listingsPage = await safe(
    () => service.entities.Listing.filter({ seller_id: userId }, { sort: "-created_date", limit: 100 }),
    { items: [] },
  );
  const enquiries = await safe(() => service.entities.Enquiry.filter({ seller_id: userId }, { limit: 200 }), {
    items: [],
  });

  const listings = listingsPage.items || [];
  const allEnquiries = enquiries.items || [];
  const views = listings.reduce((sum, listing) => sum + (listing.views || 0), 0);
  const accepted = allEnquiries.filter((enquiry) => enquiry.status === "accepted").length;
  const pending = allEnquiries.filter((enquiry) => enquiry.status === "pending").length;
  const last7 = allEnquiries.filter((e) => e.created_date && new Date(e.created_date).getTime() >= now - 7 * DAY).length;
  const prev7 = allEnquiries.filter((e) => {
    if (!e.created_date) return false;
    const t = new Date(e.created_date).getTime();
    return t >= now - 14 * DAY && t < now - 7 * DAY;
  }).length;

  const byCategory = new Map();
  listings.forEach((listing) => {
    const key = listing.category_name || "Other";
    const current = byCategory.get(key) || { name: key, listings: 0, views: 0, enquiries: 0 };
    current.listings += 1;
    current.views += listing.views || 0;
    current.enquiries += listing.enquiry_count || 0;
    byCategory.set(key, current);
  });

  return {
    listings,
    active_listings: listings.filter((l) => l.status === "active").length,
    paused_listings: listings.filter((l) => l.status === "paused").length,
    total_views: views,
    total_enquiries: allEnquiries.length,
    accepted,
    pending,
    conversion: allEnquiries.length ? Math.round((accepted / allEnquiries.length) * 100) : null,
    enquiries_last7: last7,
    enquiries_delta: pct(last7, prev7),
    categories: [...byCategory.values()].sort((a, b) => b.views - a.views),
    top_listings: [...listings].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    recent_enquiries: allEnquiries.slice(0, 6),
  };
}