// Trend detection. Everything here is derived from recorded marketplace
// activity; when there is too little of it the result says so instead of
// presenting a small sample as a market trend.
const DAY = 24 * 60 * 60 * 1000;
export const TREND_PERIODS = [7, 30, 90];

const iso = (ms) => new Date(ms).toISOString();

async function safe(read, fallback) {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

const momentum = (current, previous) => (previous > 0 ? Math.round(((current - previous) / previous) * 100) : null);

function strength(current, previous, enquiries = 0) {
  const sample = current + previous + enquiries * 3;
  if (sample < 5) return { signal_strength: "insufficient", confidence: 0 };
  if (sample < 15) return { signal_strength: "early", confidence: 35 };
  if (sample < 40) return { signal_strength: "moderate", confidence: 60 };
  return { signal_strength: "strong", confidence: 80 };
}

const runKeyFor = (periodDays, category, country) =>
  `run:${periodDays}:${category || "all"}:${country || "all"}`;

export const emptyTrends = (periodDays = 30) => ({
  period_days: periodDays,
  category: "",
  country: "",
  generated_at: new Date().toISOString(),
  products: [],
  categories: [],
  brands: [],
  searches: [],
  gaps: [],
  price_shifts: [],
  seasonal: {
    available: false,
    note: "Seasonal patterns need at least a full year of recorded activity. Not enough history yet.",
  },
  total_views: 0,
  total_enquiries: 0,
  reliable: false,
  has_activity: false,
  notes: [],
});

export async function computeTrends(service, options = {}) {
  const periodDays = TREND_PERIODS.includes(Number(options.period)) ? Number(options.period) : 30;
  const category = options.category || "";
  const country = options.country || "";
  const persist = options.persist !== false;
  const now = Date.now();
  const startMs = now - periodDays * DAY;
  const prevStartMs = now - periodDays * 2 * DAY;
  const runKey = runKeyFor(periodDays, category, country);

  const [eventPage, enquiryPage, listingPage, previousRuns] = await Promise.all([
    safe(
      () =>
        service.entities.AnalyticsEvent.filter({ created_date: { $gte: iso(prevStartMs) } }, { limit: 2000 }),
      { items: [] },
    ),
    safe(() => service.entities.Enquiry.filter({ created_date: { $gte: iso(prevStartMs) } }, { limit: 1000 }), {
      items: [],
    }),
    safe(() => service.entities.Listing.filter({ status: "active" }, { limit: 500 }), { items: [] }),
    safe(() => service.entities.ProductTrends.filter({ trend_key: runKey }, { limit: 100 }), { items: [] }),
  ]);

  const events = eventPage.items || [];
  const enquiries = enquiryPage.items || [];
  const listings = listingPage.items || [];
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));

  const matches = (listing) =>
    listing &&
    (!category || listing.category_slug === category) &&
    (!country || (listing.country || "Australia") === country);

  const views = new Map();
  const previousViews = new Map();
  const searches = new Map();
  const previousSearches = new Map();
  const categoryViews = new Map();
  const previousCategoryViews = new Map();
  const brandViews = new Map();
  const previousBrandViews = new Map();
  const bump = (map, key, amount = 1) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + amount);
  };

  events.forEach((event) => {
    const at = new Date(event.created_date || 0).getTime();
    if (!at) return;
    const current = at >= startMs;
    const listing = event.listing_id ? listingById.get(event.listing_id) : null;

    if (event.event_type === "search") {
      if (category) return;
      bump(current ? searches : previousSearches, event.search_term);
      return;
    }
    if (event.event_type !== "listing_view") return;
    if (listing) {
      if (!matches(listing)) return;
      bump(current ? views : previousViews, listing.id);
      bump(current ? categoryViews : previousCategoryViews, listing.category_name || event.category_name);
      bump(current ? brandViews : previousBrandViews, listing.brand || event.brand);
      return;
    }
    if (category && event.category_slug !== category) return;
    bump(current ? categoryViews : previousCategoryViews, event.category_name);
    bump(current ? brandViews : previousBrandViews, event.brand);
  });

  const enquiriesCurrent = new Map();
  const enquiriesPrevious = new Map();
  const categoryEnquiries = new Map();
  enquiries.forEach((enquiry) => {
    const listing = listingById.get(enquiry.listing_id);
    if (listing && !matches(listing)) return;
    if (!listing && category) return;
    const at = new Date(enquiry.created_date || 0).getTime();
    if (!at) return;
    const current = at >= startMs;
    if (listing) bump(current ? enquiriesCurrent : enquiriesPrevious, listing.id);
    const label = listing?.category_name || "";
    if (label) bump(categoryEnquiries, label);
  });

  const products = [...new Set([...views.keys(), ...previousViews.keys()])]
    .map((id) => {
      const listing = listingById.get(id);
      const current = views.get(id) || 0;
      const previous = previousViews.get(id) || 0;
      const enquiryCount = enquiriesCurrent.get(id) || 0;
      return {
        ref_id: id,
        label: listing?.title || "Listing",
        category_slug: listing?.category_slug || "",
        category_name: listing?.category_name || "",
        current_count: current,
        previous_count: previous,
        enquiries: enquiryCount,
        momentum_pct: momentum(current, previous),
        ...strength(current, previous, enquiryCount),
      };
    })
    .filter((row) => row.current_count + row.previous_count + row.enquiries > 0)
    .sort((a, b) => b.current_count + b.enquiries * 2 - (a.current_count + a.enquiries * 2))
    .slice(0, 10);

  const listingsByCategory = new Map();
  listings.forEach((listing) => {
    if (!matches(listing)) return;
    const label = listing.category_name || "Other";
    const entry = listingsByCategory.get(label) || { count: 0, priceTotal: 0, priceCount: 0 };
    entry.count += 1;
    entry.priceTotal += Number(listing.price) || 0;
    entry.priceCount += 1;
    listingsByCategory.set(label, entry);
  });

  const previousPrice = new Map(
    (previousRuns.items || [])
      .filter((row) => row.trend_type === "price_shift" && row.previous_count)
      .map((row) => [row.label, row.previous_count]),
  );

  const categories = [...new Set([...categoryViews.keys(), ...previousCategoryViews.keys()])]
    .filter(Boolean)
    .map((label) => {
      const current = categoryViews.get(label) || 0;
      const previous = previousCategoryViews.get(label) || 0;
      const stock = listingsByCategory.get(label);
      const enquiryCount = categoryEnquiries.get(label) || 0;
      return {
        label,
        current_count: current,
        previous_count: previous,
        enquiries: enquiryCount,
        listings: stock?.count || 0,
        avg_price: stock?.priceCount ? Math.round(stock.priceTotal / stock.priceCount) : null,
        momentum_pct: momentum(current, previous),
        ...strength(current, previous, enquiryCount),
      };
    })
    .sort((a, b) => b.current_count - a.current_count)
    .slice(0, 10);

  const brands = [...new Set([...brandViews.keys(), ...previousBrandViews.keys()])]
    .filter(Boolean)
    .map((label) => {
      const current = brandViews.get(label) || 0;
      const previous = previousBrandViews.get(label) || 0;
      return {
        label,
        current_count: current,
        previous_count: previous,
        momentum_pct: momentum(current, previous),
        ...strength(current, previous),
      };
    })
    .sort((a, b) => b.current_count - a.current_count)
    .slice(0, 8);

  const searchRows = [...new Set([...searches.keys(), ...previousSearches.keys()])]
    .filter(Boolean)
    .map((term) => {
      const current = searches.get(term) || 0;
      const previous = previousSearches.get(term) || 0;
      return {
        label: term,
        current_count: current,
        previous_count: previous,
        momentum_pct: momentum(current, previous),
        ...strength(current, previous),
      };
    })
    .sort((a, b) => b.current_count - a.current_count)
    .slice(0, 10);

  const priceShifts = [...listingsByCategory.entries()]
    .filter(([, stock]) => stock.priceCount > 0)
    .map(([label, stock]) => {
      const avg = Math.round(stock.priceTotal / stock.priceCount);
      const before = previousPrice.get(label) || null;
      return {
        label,
        current_count: stock.count,
        previous_count: before || 0,
        avg_price: avg,
        previous_avg_price: before,
        momentum_pct: before ? Math.round(((avg - before) / before) * 100) : null,
        ...strength(stock.count, before ? 1 : 0),
      };
    })
    .filter((row) => row.previous_avg_price)
    .slice(0, 6);

  const gaps = categories
    .filter((row) => row.current_count >= 10 && row.listings > 0 && row.listings <= 3)
    .map((row) => ({
      label: row.label,
      current_count: row.current_count,
      listings: row.listings,
      note: `${row.current_count} views in the last ${periodDays} days against ${row.listings} active listing${row.listings === 1 ? "" : "s"}. Interest is running ahead of supply here.`,
      ...strength(row.current_count, row.previous_count, row.enquiries),
    }));

  const totalViews = [...views.values()].reduce((sum, value) => sum + value, 0);
  const totalEnquiries = [...enquiriesCurrent.values()].reduce((sum, value) => sum + value, 0);
  const reliable = totalViews + totalEnquiries * 3 >= 20;

  const payload = {
    period_days: periodDays,
    category,
    country,
    generated_at: new Date(now).toISOString(),
    products,
    categories,
    brands,
    searches,
    gaps,
    price_shifts: priceShifts,
    seasonal: {
      available: false,
      note: "Seasonal patterns need at least a full year of recorded activity. Not enough history yet.",
    },
    total_views: totalViews,
    total_enquiries: totalEnquiries,
    reliable,
    has_activity: totalViews + totalEnquiries > 0,
    notes: [
      "Views, searches and enquiries are engagement signals, not sales.",
      "A trend is only shown as established when the sample behind it is large enough.",
    ],
  };

  // Snapshots are written at most once an hour so repeated visits cannot flood
  // the table, while still keeping the price history needed for comparisons.
  const lastSnapshot = (previousRuns.items || [])
    .map((row) => new Date(row.generated_at || 0).getTime())
    .reduce((latest, value) => Math.max(latest, value || 0), 0);

  if (persist && now - lastSnapshot > 60 * 60 * 1000) {
    await safe(async () => {
      await service.entities.ProductTrends.deleteMany({ trend_key: runKey });
      const rows = [
        ...products.map((row) => ({
          trend_type: "product",
          label: row.label,
          ref_id: row.ref_id,
          category_slug: row.category_slug,
          current_count: row.current_count,
          previous_count: row.previous_count,
          enquiries: row.enquiries,
          momentum_pct: row.momentum_pct,
          signal_strength: row.signal_strength,
          confidence: row.confidence,
        })),
        ...categories.map((row) => ({
          trend_type: "category",
          label: row.label,
          current_count: row.current_count,
          previous_count: row.previous_count,
          enquiries: row.enquiries,
          listings: row.listings,
          avg_price: row.avg_price || undefined,
          momentum_pct: row.momentum_pct,
          signal_strength: row.signal_strength,
          confidence: row.confidence,
        })),
        ...brands.map((row) => ({
          trend_type: "brand",
          label: row.label,
          current_count: row.current_count,
          previous_count: row.previous_count,
          momentum_pct: row.momentum_pct,
          signal_strength: row.signal_strength,
          confidence: row.confidence,
        })),
        ...priceShifts.map((row) => ({
          trend_type: "price_shift",
          label: row.label,
          current_count: row.current_count,
          previous_count: row.previous_avg_price || 0,
          momentum_pct: row.momentum_pct,
          signal_strength: row.signal_strength,
          confidence: row.confidence,
        })),
        ...gaps.map((row) => ({
          trend_type: "supply_gap",
          label: row.label,
          current_count: row.current_count,
          listings: row.listings,
          signal_strength: row.signal_strength,
          confidence: row.confidence,
        })),
      ].map((row) => ({
        ...row,
        trend_key: runKey,
        category_slug: row.category_slug || category,
        country: country || "Australia",
        period_days: periodDays,
        generated_at: payload.generated_at,
        has_real_data: true,
      }));

      if (rows.length) await service.entities.ProductTrends.bulkCreate(rows);
    }, null);
  }

  return payload;
}