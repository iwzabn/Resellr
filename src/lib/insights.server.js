// Seller and platform analytics, computed from recorded records only.
// Anything that cannot be measured from real data is returned as null with a
// note, never estimated silently.
import { TREND_PERIODS } from "@/lib/trends.server";

const DAY = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

async function safe(read, fallback) {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

const average = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
};

const withinDays = (value, days, now) => {
  if (!value) return false;
  return now - new Date(value).getTime() <= days * DAY;
};

const pct = (part, total) => (total ? Math.round((part / total) * 100) : null);

function bucketDays(events, days, now) {
  const rows = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const start = now - (index + 1) * DAY;
    const end = now - index * DAY;
    rows.push({
      date: new Date(end).toISOString().slice(0, 10),
      views: events.filter((event) => {
        const at = new Date(event.created_date || 0).getTime();
        return at >= start && at < end;
      }).length,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Seller insights
// ---------------------------------------------------------------------------

function ruleRecommendations({ listings, enquiries, categoryAvgPrice }) {
  const rows = [];
  const active = listings.filter((listing) => listing.status === "active");

  active.slice(0, 8).forEach((listing) => {
    if ((listing.title || "").length < 25) {
      rows.push({
        kind: "title",
        title: "Give this listing a more specific title",
        detail: `“${listing.title}” is short. Include brand, model, size or condition so buyers searching for those terms can find it.`,
        basis: "Title length on your own listing",
        confidence: 70,
        ref_listing_id: listing.id,
        data_points: 1,
      });
    }
    if ((listing.description || "").length < 120) {
      rows.push({
        kind: "description",
        title: "Add detail to the description",
        detail: "List condition, what is included, any marks, and how you pack or post. Descriptions under 120 characters leave buyers guessing.",
        basis: "Description length on your own listing",
        confidence: 65,
        ref_listing_id: listing.id,
        data_points: 1,
      });
    }
    if ((listing.images || []).length < 2) {
      rows.push({
        kind: "description",
        title: "Add more photos",
        detail: "Listings with several photos show the item from every angle and cut down on back-and-forth questions.",
        basis: "Photo count on your own listing",
        confidence: 60,
        ref_listing_id: listing.id,
        data_points: (listing.images || []).length,
      });
    }

    const categoryAverage = categoryAvgPrice.get(listing.category_name);
    if (categoryAverage && listing.price > categoryAverage * 1.35) {
      rows.push({
        kind: "pricing",
        title: "Your asking price is well above the category average",
        detail: `“${listing.title}” is listed at ${Math.round(listing.price)} while the current average asking price in ${listing.category_name} is about ${categoryAverage}. This is an estimate from active asking prices, not sale prices.`,
        basis: "Active asking prices in the same category",
        is_estimate: true,
        confidence: 55,
        ref_listing_id: listing.id,
        data_points: 1,
      });
    }
    if ((listing.views || 0) === 0 && withinDays(listing.created_date, 7, Date.now())) {
      rows.push({
        kind: "interest",
        title: "No views recorded on this listing yet",
        detail: "It has been live less than a week with no recorded views. A clearer title and first photo are the usual fixes.",
        basis: "Views recorded in the last 7 days",
        confidence: 50,
        ref_listing_id: listing.id,
        data_points: 0,
      });
    }
    if (listing.category_slug === "other" && listing.brand) {
      rows.push({
        kind: "category",
        title: "Move this listing out of Other",
        detail: `You listed a ${listing.brand} item under “Other”. A specific category puts it in front of buyers browsing that section.`,
        basis: "Category and brand on your own listing",
        confidence: 60,
        ref_listing_id: listing.id,
        data_points: 1,
      });
    }
  });

  if (enquiries.length >= 5) {
    const unanswered = enquiries.filter((enquiry) => enquiry.status === "pending").length;
    if (unanswered >= 3) {
      rows.push({
        kind: "interest",
        title: "Several enquiries are still waiting for a reply",
        detail: `${unanswered} of your ${enquiries.length} enquiries have no decision recorded. Fast replies are the clearest driver of completed sales.`,
        basis: "Status of enquiries you received",
        confidence: 80,
        data_points: enquiries.length,
      });
    }
  }

  return rows.slice(0, 8);
}

async function modelRecommendations(service, listings) {
  const sample = listings.slice(0, 3);
  if (!sample.length) return [];
  const schema = {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["title", "description"] },
            title: { type: "string" },
            detail: { type: "string" },
            basis: { type: "string" },
            listing_id: { type: "string" },
          },
          required: ["kind", "title", "detail", "basis", "listing_id"],
        },
      },
    },
    required: ["suggestions"],
  };

  const result = await service.integrations.Core.InvokeLLM({
    prompt: `You advise sellers on "Resellr", an Australian reseller marketplace. Suggest concrete improvements to listing titles and descriptions.

Rules:
- Use only the listing data below. Never invent views, prices, sales or buyer behaviour.
- Suggestions must be specific to the listing, not generic advice.
- Do not claim any outcome will happen (no "this will sell faster").
- Keep each detail under 220 characters.
- Only return suggestions for the listing ids given.

LISTINGS:
${sample.map((listing) => `id: ${listing.id}\n title: ${listing.title}\n category: ${listing.category_name}\n condition: ${listing.condition}\n description: ${(listing.description || "").slice(0, 300)}`).join("\n\n")}

Return JSON only.`,
    response_json_schema: schema,
  });

  const allowed = new Set(sample.map((listing) => listing.id));
  return (result?.suggestions || [])
    .filter((row) => allowed.has(row.listing_id))
    .slice(0, 3)
    .map((row) => ({
      kind: ["title", "description"].includes(row.kind) ? row.kind : "title",
      title: String(row.title || "Listing improvement").slice(0, 120),
      detail: String(row.detail || "").slice(0, 320),
      basis: String(row.basis || "Your listing content").slice(0, 160),
      confidence: 50,
      is_estimate: true,
      ref_listing_id: row.listing_id,
      data_points: 1,
    }));
}

export async function buildSellerInsights(service, userId, { period = 30, persist = true } = {}) {
  const periodDays = TREND_PERIODS.includes(Number(period)) ? Number(period) : 30;
  const now = Date.now();

  const [listingsPage, enquiriesPage, eventPage, categoryPrices, aiPage] = await Promise.all([
    safe(() => service.entities.Listing.filter({ seller_id: userId }, { sort: "-created_date", limit: 100 }), {
      items: [],
    }),
    safe(() => service.entities.Enquiry.filter({ seller_id: userId }, { sort: "-created_date", limit: 300 }), {
      items: [],
    }),
    safe(
      () =>
        service.entities.AnalyticsEvent.filter(
          { seller_id: userId, event_type: "listing_view", created_date: { $gte: iso(now - 90 * DAY) } },
          { limit: 2000 },
        ),
      { items: [] },
    ),
    safe(
      () => service.entities.Listing.aggregate({ query: { status: "active" }, groupBy: "category_name", avg: ["price"] }),
      { rows: [] },
    ),
    safe(
      () =>
        service.entities.AIRecommendations.filter(
          { seller_id: userId, generated_by: "ai", status: "open" },
          { sort: "-created_date", limit: 3 },
        ),
      { items: [] },
    ),
  ]);

  const listings = listingsPage.items || [];
  const enquiries = enquiriesPage.items || [];
  const events = eventPage.items || [];
  const active = listings.filter((listing) => listing.status === "active");

  const categoryAvgPrice = new Map(
    (categoryPrices.rows || []).filter((row) => row.category_name).map((row) => [row.category_name, Math.round(row.avg_price || 0)]),
  );

  const windows = TREND_PERIODS.map((days) => {
    const windowEnquiries = enquiries.filter((enquiry) => withinDays(enquiry.created_date, days, now));
    const accepted = windowEnquiries.filter(
      (enquiry) => enquiry.status === "accepted" && withinDays(enquiry.decided_at || enquiry.created_date, days, now),
    ).length;
    return {
      days,
      views: events.filter((event) => withinDays(event.created_date, days, now)).length,
      enquiries: windowEnquiries.length,
      accepted,
      conversion_pct: pct(accepted, windowEnquiries.length),
    };
  });

  const current = windows.find((row) => row.days === periodDays) || windows[1];
  const avgPrice = average(active.map((listing) => Number(listing.price)));

  const topListings = [...listings]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      status: listing.status,
      views: listing.views || 0,
      enquiries: listing.enquiry_count || 0,
      price: listing.price,
      currency: listing.currency || "AUD",
    }));

  const daily = bucketDays(
    events.filter((event) => event.event_type === "listing_view"),
    Math.min(periodDays, 30),
    now,
  );

  // Model suggestions are cached for an hour: refreshing the dashboard must not
  // spend an AI request every time, and unchanged listings get stable advice.
  const storedAi = (aiPage.items || []).filter((row) => row.generated_by === "ai");
  const aiFresh =
    storedAi.length > 0 && now - new Date(storedAi[0].created_date || 0).getTime() < 60 * 60 * 1000;
  let modelRows = [];
  if (listings.length) {
    modelRows = aiFresh
      ? storedAi.slice(0, 3).map((row) => ({
          kind: row.kind,
          title: row.title,
          detail: row.detail,
          basis: row.basis,
          is_estimate: !!row.is_estimate,
          confidence: row.confidence || 50,
          ref_listing_id: row.ref_listing_id || "",
          data_points: row.data_points || 0,
          from_model: true,
        }))
      : (await safe(() => modelRecommendations(service, listings), [])).map((row) => ({
          ...row,
          from_model: true,
        }));
  }
  const recommendations = [
    ...ruleRecommendations({ listings, enquiries, categoryAvgPrice }).map((row) => ({ ...row, from_model: false })),
    ...modelRows,
  ];

  const insights = {
    period_days: periodDays,
    windows,
    current,
    active_listings: active.length,
    paused_listings: listings.filter((listing) => listing.status === "paused").length,
    sold_listings: listings.filter((listing) => listing.status === "sold").length,
    total_listings: listings.length,
    total_views: listings.reduce((sum, listing) => sum + (listing.views || 0), 0),
    period_views: current.views,
    total_enquiries: enquiries.length,
    accepted_total: enquiries.filter((enquiry) => enquiry.status === "accepted").length,
    avg_listing_price: avgPrice,
    conversion_pct: current.conversion_pct,
    completed_sales: null,
    completed_sales_note:
      "Payment and handover happen directly between buyer and seller, so completed sales are not recorded by the platform. Accepted enquiries are shown instead.",
    daily,
    top_listings: topListings,
    recommendations: recommendations.map(({ from_model, ...row }) => row),
    has_activity: current.views + current.enquiries > 0,
  };

  if (persist) {
    await safe(async () => {
      await service.entities.SellerAnalytics.deleteMany({ seller_id: userId, period_days: periodDays });
      await service.entities.SellerAnalytics.create({
        seller_id: userId,
        period_days: periodDays,
        active_listings: insights.active_listings,
        total_listings: insights.total_listings,
        views: insights.period_views,
        enquiries: current.enquiries,
        accepted: current.accepted,
        conversion_pct: current.conversion_pct ?? undefined,
        avg_listing_price: avgPrice ?? undefined,
        top_listing_label: topListings[0]?.title || "",
        has_activity: insights.has_activity,
        computed_at: new Date(now).toISOString(),
      });

      // While the cached model advice is still fresh only the rule-based rows are
      // replaced, so the stored suggestions keep their original timestamp.
      await service.entities.AIRecommendations.deleteMany(
        aiFresh
          ? { seller_id: userId, status: "open", generated_by: "rules" }
          : { seller_id: userId, status: "open" },
      );
      const rows = (aiFresh ? recommendations.filter((row) => !row.from_model) : recommendations).map((row) => ({
        seller_id: userId,
        kind: row.kind,
        title: row.title,
        detail: row.detail,
        basis: row.basis,
        is_estimate: !!row.is_estimate,
        confidence: row.confidence || 50,
        ref_listing_id: row.ref_listing_id || "",
        data_points: row.data_points || 0,
        status: "open",
        generated_by: row.from_model ? "ai" : "rules",
      }));
      if (rows.length) await service.entities.AIRecommendations.bulkCreate(rows);
    }, null);
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Platform (admin) analytics — aggregates only, no private content
// ---------------------------------------------------------------------------

export async function buildAdminAnalytics(service) {
  const now = Date.now();
  const monthAgo = iso(now - 30 * DAY);

  const [users, listings, enquiries, eventsPage, subscriptions, adPage, reportStatus, reportVerification, casesPage, profilesPage, messagesCount] =
    await Promise.all([
      safe(() => service.entities.User.list(), []),
      safe(() => service.entities.Listing.filter({}, { limit: 500 }), { items: [] }),
      safe(() => service.entities.Enquiry.filter({}, { limit: 500 }), { items: [] }),
      safe(
        () => service.entities.AnalyticsEvent.filter({ created_date: { $gte: iso(now - 30 * DAY) } }, { limit: 3000 }),
        { items: [] },
      ),
      safe(() => service.entities.Subscription.aggregate({ groupBy: "plan" }), { rows: [] }),
      safe(() => service.entities.Advertisement.filter({}, { limit: 100 }), { items: [] }),
      safe(() => service.entities.CommunityReport.aggregate({ groupBy: "status" }), { rows: [] }),
      safe(() => service.entities.CommunityReport.aggregate({ groupBy: "verification" }), { rows: [] }),
      safe(() => service.entities.ModerationCase.list({ sort: "-created_date", limit: 200 }), { items: [] }),
      safe(() => service.entities.UserProfile.filter({}, { limit: 500 }), { items: [] }),
      safe(() => service.entities.Message.count({}), 0),
    ]);

  const allListings = listings.items || [];
  const allEnquiries = enquiries.items || [];
  const events = eventsPage.items || [];
  const ads = adPage.items || [];
  const cases = casesPage.items || [];

  const activeUserIds = new Set();
  allEnquiries.forEach((enquiry) => {
    if (withinDays(enquiry.created_date, 30, now)) {
      if (enquiry.buyer_id) activeUserIds.add(enquiry.buyer_id);
      if (enquiry.seller_id) activeUserIds.add(enquiry.seller_id);
    }
  });
  allListings.forEach((listing) => {
    if (withinDays(listing.created_date, 30, now) && listing.seller_id) activeUserIds.add(listing.seller_id);
  });

  const byCategory = new Map();
  allListings.forEach((listing) => {
    if (listing.status !== "active") return;
    const label = listing.category_name || "Other";
    const entry = byCategory.get(label) || { label, listings: 0, views: 0, enquiries: 0 };
    entry.listings += 1;
    entry.views += listing.views || 0;
    entry.enquiries += listing.enquiry_count || 0;
    byCategory.set(label, entry);
  });

  const regions = new Map();
  allListings.forEach((listing) => {
    if (!listing.region) return;
    regions.set(listing.region, (regions.get(listing.region) || 0) + 1);
  });

  const activity = [];
  for (let index = 13; index >= 0; index -= 1) {
    const start = now - (index + 1) * DAY;
    const end = now - index * DAY;
    activity.push({
      date: new Date(end).toISOString().slice(0, 10),
      views: events.filter((event) => {
        const at = new Date(event.created_date || 0).getTime();
        return event.event_type === "listing_view" && at >= start && at < end;
      }).length,
      enquiries: allEnquiries.filter((enquiry) => {
        const at = new Date(enquiry.created_date || 0).getTime();
        return at >= start && at < end;
      }).length,
    });
  }

  const planRows = subscriptions.rows || [];
  const planCount = (name) => planRows.find((row) => row.plan === name)?.count || 0;

  const statusRows = reportStatus.rows || [];
  const verificationRows = reportVerification.rows || [];

  return {
    users_total: users.length,
    users_admins: users.filter((user) => user.role === "admin").length,
    users_active_30d: activeUserIds.size,
    profiles: profilesPage.items || [],
    listings_total: allListings.length,
    listings_active: allListings.filter((listing) => listing.status === "active").length,
    listings_removed: allListings.filter((listing) => listing.status === "removed").length,
    listings_sponsored: allListings.filter((listing) => listing.is_sponsored).length,
    sponsored_views: allListings.filter((listing) => listing.is_sponsored).reduce((sum, listing) => sum + (listing.views || 0), 0),
    enquiries_total: allEnquiries.length,
    enquiries_30d: allEnquiries.filter((enquiry) => withinDays(enquiry.created_date, 30, now)).length,
    enquiries_pending: allEnquiries.filter((enquiry) => enquiry.status === "pending").length,
    enquiries_accepted: allEnquiries.filter((enquiry) => enquiry.status === "accepted").length,
    messages_total: messagesCount,
    completed_sales: null,
    completed_sales_note: "Completed sales are not tracked: payment is arranged directly between buyer and seller.",
    categories: [...byCategory.values()].sort((a, b) => b.listings - a.listings).slice(0, 10),
    regions: [...regions.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    subscriptions: { free: planCount("free"), premium: planCount("premium"), total: planRows.reduce((sum, row) => sum + (row.count || 0), 0) },
    ads: {
      total: ads.length,
      active: ads.filter((ad) => ad.status === "active").length,
      by_placement: ["homepage_banner", "category_boost", "rail"].map((placement) => ({
        placement,
        count: ads.filter((ad) => ad.placement === placement).length,
      })),
      impressions_note: "Ad impressions are not recorded, so views on sponsored listings are shown instead.",
    },
    reports: {
      total: statusRows.reduce((sum, row) => sum + (row.count || 0), 0),
      pending: statusRows.find((row) => row.status === "pending")?.count || 0,
      under_review: statusRows.find((row) => row.status === "under_review")?.count || 0,
      resolved: statusRows.find((row) => row.status === "resolved")?.count || 0,
      dismissed: statusRows.find((row) => row.status === "dismissed")?.count || 0,
      verified: verificationRows.find((row) => row.verification === "verified")?.count || 0,
      unverified: verificationRows.find((row) => row.verification === "unverified")?.count || 0,
      unsubstantiated: verificationRows.find((row) => row.verification === "unsubstantiated")?.count || 0,
    },
    moderation: {
      cases: cases.length,
      warnings: cases.filter((row) => row.action === "warning").length,
      listings_removed: cases.filter((row) => row.action === "listing_removed").length,
      accounts_limited: cases.filter((row) => row.action === "account_limited" || row.action === "account_suspended").length,
      appeals_open: cases.filter((row) => row.appeal_status === "submitted").length,
      assessments_flagged: 0,
    },
    activity,
    generated_at: new Date(now).toISOString(),
  };
}