import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";
import { buildSellerAnalytics } from "@/lib/market.server";
import { runItemCheck } from "@/lib/api/item-check";

const DEFAULT_LIMITS = { free: 5, premium: 50 };

const readLimits = async (service) => {
  const page = await service.entities.PlatformSetting.filter({}, { limit: 20 }).catch(() => ({ items: [] }));
  const map = new Map((page.items || []).map((row) => [row.key, row]));
  return {
    free: map.get("listing_limit_free")?.number_value ?? DEFAULT_LIMITS.free,
    premium: map.get("listing_limit_premium")?.number_value ?? DEFAULT_LIMITS.premium,
    premium_price: map.get("premium_price_aud")?.number_value ?? 9.99,
  };
};

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;

    const [profilePage, subscriptionPage, limits, locationPage] = await Promise.all([
      service.entities.UserProfile.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
      service.entities.Subscription.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
      readLimits(service),
      service.entities.LocationPreferences.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
    ]);

    let profile = profilePage.items?.[0] || null;
    if (!profile) {
      profile = await service.entities.UserProfile
        .create({
          user_id: user.id,
          username: (user.email || "reseller").split("@")[0],
          country: "Australia",
          is_seller: true,
          seller_since: new Date().toISOString(),
        })
        .catch(() => null);
    }

    let subscription = subscriptionPage.items?.[0] || null;
    if (!subscription) {
      subscription = await service.entities.Subscription
        .create({
          user_id: user.id,
          plan: "free",
          status: "active",
          price_aud: 0,
          listing_limit: limits.free,
        })
        .catch(() => null);
    }

    const activeListings = await service.entities.Listing
      .count({ seller_id: user.id, status: "active" })
      .catch(() => 0);

    return {
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      profile,
      subscription,
      limits,
      location: locationPage.items?.[0] || null,
      usage: { active_listings: activeListings },
    };
  });

export const getSellerDashboard = createServerFn({ method: "GET" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const service = context.getBase44().asServiceRole;
    const analytics = await buildSellerAnalytics(service, context.user.id);
    const [subscriptionPage, limits] = await Promise.all([
      service.entities.Subscription.filter({ user_id: context.user.id }, { limit: 1 }).catch(() => ({ items: [] })),
      readLimits(service),
    ]);
    return {
      analytics,
      subscription: subscriptionPage.items?.[0] || null,
      limits,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      username: z.string().min(3).max(30),
      bio: z.string().max(600),
      avatar_url: z.string().max(500).optional(),
      country: z.string().max(60),
      city: z.string().max(80),
      region: z.string().max(60),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const page = await service.entities.UserProfile
      .filter({ user_id: context.user.id }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const profile = page.items?.[0];

    const payload = {
      username: data.username.trim(),
      bio: data.bio,
      avatar_url: data.avatar_url || "",
      country: data.country,
      city: data.city,
      region: data.region,
      is_seller: true,
    };

    if (profile) {
      await service.entities.UserProfile.update(profile.id, payload);
      return { id: profile.id };
    }
    const created = await service.entities.UserProfile.create({
      user_id: context.user.id,
      ...payload,
      seller_since: new Date().toISOString(),
    });
    return { id: created.id };
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      title: z.string().min(6).max(120),
      description: z.string().max(4000),
      images: z.array(z.string().max(600)).min(1).max(6),
      price: z.number().positive().max(1000000),
      category_slug: z.string().min(1).max(60),
      category_name: z.string().max(80),
      subcategory: z.string().max(60).optional(),
      condition: z.string().max(40),
      brand: z.string().max(60).optional(),
      stock: z.number().int().min(1).max(999),
      delivery_options: z.array(z.string().max(40)).max(6),
      city: z.string().max(80).optional(),
      region: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const user = context.user;

    const [subscriptionPage, limits, profilePage, active] = await Promise.all([
      service.entities.Subscription.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
      readLimits(service),
      service.entities.UserProfile.filter({ user_id: user.id }, { limit: 1 }).catch(() => ({ items: [] })),
      service.entities.Listing.count({ seller_id: user.id, status: "active" }).catch(() => 0),
    ]);

    const subscription = subscriptionPage.items?.[0];
    const plan = subscription?.plan || "free";
    const limit = subscription?.listing_limit || limits[plan] || limits.free;
    if (active >= limit) {
      throw new Error(
        `Your ${plan} plan allows ${limit} active listings. Pause one, or upgrade for a higher allowance.`,
      );
    }

    // Nothing reaches the marketplace unchecked: a blocked item is refused, and
    // anything the check cannot clear is held for a moderator before it is live.
    const check = await runItemCheck(service, {
      title: data.title,
      description: data.description,
      category_slug: data.category_slug,
      brand: data.brand || "",
      price: data.price,
      condition: data.condition,
      images: data.images,
      source: "listing",
      userId: user.id,
    });
    if (check.verdict === "blocked") {
      throw new Error(`This item cannot be published. ${check.reason}`);
    }
    const held = check.verdict === "needs_review";

    const profile = profilePage.items?.[0];
    const created = await service.entities.Listing.create({
      ...data,
      subcategory: data.subcategory || "",
      brand: data.brand || "",
      city: data.city || "",
      region: data.region || "",
      currency: "AUD",
      country: "Australia",
      status: held ? "pending_review" : "active",
      check_verdict: check.verdict,
      is_sponsored: false,
      is_demo: false,
      moderation_note: held ? `Automatic check: ${check.reason}`.slice(0, 400) : "",
      views: 0,
      enquiry_count: 0,
      seller_id: user.id,
      seller_name: user.full_name || "Reseller",
      seller_username: profile?.username || "",
      seller_avatar: profile?.avatar_url || "",
    });

    await service.entities.AnalyticsEvent
      .create({
        event_type: "listing_created",
        listing_id: created.id,
        category_slug: created.category_slug,
        category_name: created.category_name,
        brand: created.brand,
        seller_id: user.id,
        region: created.region,
      })
      .catch(() => null);

    return {
      id: created.id,
      status: created.status,
      note: held ? check.reason : "",
    };
  });

export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1).max(80),
      title: z.string().min(6).max(120),
      description: z.string().max(4000),
      images: z.array(z.string().max(600)).min(1).max(6),
      price: z.number().positive().max(1000000),
      category_slug: z.string().min(1).max(60),
      category_name: z.string().max(80),
      subcategory: z.string().max(60).optional(),
      condition: z.string().max(40),
      brand: z.string().max(60).optional(),
      stock: z.number().int().min(1).max(999),
      delivery_options: z.array(z.string().max(40)).max(6),
      city: z.string().max(80).optional(),
      region: z.string().max(60).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const { id, ...values } = data;

    const listing = await service.entities.Listing.get(id).catch(() => null);
    if (!listing) throw new Error("That listing could not be found.");
    if (listing.seller_id !== context.user.id && listing.created_by_id !== context.user.id) {
      throw Object.assign(new Error("You can only edit your own listings."), { status: 403 });
    }

    // Editing is held to the same item check as publishing.
    const check = await runItemCheck(service, {
      title: values.title,
      description: values.description,
      category_slug: values.category_slug,
      brand: values.brand || "",
      price: values.price,
      condition: values.condition,
      images: values.images,
      source: "listing",
      userId: context.user.id,
    });
    if (check.verdict === "blocked") {
      throw new Error(`This item cannot be published. ${check.reason}`);
    }

    const held = check.verdict === "needs_review";
    const wasHeld = listing.status === "pending_review";
    // An edit cannot revive a sold or removed listing, and an unclear edit sends
    // the listing back for review; a clear edit releases one that was held.
    const nextStatus =
      listing.status === "sold" || listing.status === "removed"
        ? listing.status
        : held
          ? "pending_review"
          : wasHeld
            ? "active"
            : listing.status;

    await service.entities.Listing.update(id, {
      ...values,
      subcategory: values.subcategory || "",
      brand: values.brand || "",
      city: values.city || "",
      region: values.region || "",
      status: nextStatus,
      check_verdict: check.verdict,
      moderation_note: held
        ? `Automatic check: ${check.reason}`.slice(0, 400)
        : wasHeld
          ? ""
          : listing.moderation_note || "",
    });
    return { id, status: nextStatus, note: held ? check.reason : "" };
  });

// Renewing, pausing and resuming go through here so a listing held for review
// can never be pushed live from the seller's own screen.
export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      id: z.string().min(1).max(80),
      status: z.enum(["active", "paused"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const listing = await service.entities.Listing.get(data.id).catch(() => null);
    if (!listing) throw new Error("That listing could not be found.");
    if (listing.seller_id !== context.user.id && listing.created_by_id !== context.user.id) {
      throw Object.assign(new Error("You can only change your own listings."), { status: 403 });
    }
    if (data.status === "active") {
      if (listing.status === "removed") {
        throw new Error("This listing was removed by a moderator and cannot be relisted.");
      }
      if (listing.status === "pending_review" || listing.check_verdict === "blocked") {
        throw new Error("A moderator still needs to approve this listing before it can go live.");
      }
    }
    await service.entities.Listing.update(data.id, {
      status: data.status,
      ...(data.status === "active" ? { renewed_date: new Date().toISOString() } : {}),
    });
    return { status: data.status };
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .validator(z.object({ user_id: z.string().min(1).max(80) }))
  .handler(async ({ data, context }) => {
    const service = context.getBase44().asServiceRole;
    const [profilePage, listingsPage, reviewsPage] = await Promise.all([
      service.entities.UserProfile.filter({ user_id: data.user_id }, { limit: 1 }).catch(() => ({ items: [] })),
      service.entities.Listing
        .filter({ seller_id: data.user_id, status: "active" }, { sort: "-created_date", limit: 12 })
        .catch(() => ({ items: [] })),
      service.entities.Review
        .filter({ subject_user_id: data.user_id, status: "published" }, { sort: "-created_date", limit: 10 })
        .catch(() => ({ items: [] })),
    ]);
    return {
      profile: profilePage.items?.[0] || null,
      listings: listingsPage.items || [],
      reviews: reviewsPage.items || [],
    };
  });