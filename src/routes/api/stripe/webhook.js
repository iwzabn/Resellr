import { createFileRoute } from "@tanstack/react-router";
import { secrets } from "base44:runtime";

const STRIPE_API = "https://api.stripe.com/v1";
const PREMIUM_FALLBACK_PRICE = 9.99;

const hexToHex = (bytes) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const verifySignature = async (payload, header, secret) => {
  if (!header) return false;
  const timestamp = header.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const candidates = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || candidates.length === 0) return false;
  // Reject replayed deliveries: Stripe's own tolerance is five minutes.
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)),
  );
  const expected = hexToHex(signature);
  return candidates.some((candidate) => candidate === expected);
};

const stripeGet = async (path, key) => {
  const response = await fetch(`${STRIPE_API}/${path}`, {
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2025-10-29.clover" },
  });
  if (!response.ok) throw new Error(`Stripe read failed: ${path}`);
  return response.json();
};

const readLimits = async (service) => {
  const page = await service.entities.PlatformSetting.filter({}, { limit: 20 }).catch(() => ({ items: [] }));
  const map = new Map((page.items || []).map((row) => [row.key, row]));
  return {
    free: map.get("listing_limit_free")?.number_value ?? 5,
    premium: map.get("listing_limit_premium")?.number_value ?? 50,
  };
};

const applyPlan = async (service, userId, { plan, status, priceAud, limit, reference, periodEnd, cancelAtPeriodEnd = false }) => {
  const page = await service.entities.Subscription
    .filter({ user_id: userId }, { limit: 1 })
    .catch(() => ({ items: [] }));
  const existing = page.items?.[0];
  const payload = {
    plan,
    status,
    price_aud: priceAud,
    listing_limit: limit,
    provider: "stripe",
    provider_reference: reference || "",
    current_period_end: periodEnd || "",
    cancel_at_period_end: Boolean(cancelAtPeriodEnd),
  };
  if (existing) {
    await service.entities.Subscription.update(existing.id, payload);
  } else {
    await service.entities.Subscription.create({ user_id: userId, ...payload });
  }
};

const handleEvent = async (service, event, stripeKey) => {
  const limits = await readLimits(service);
  const object = event.data?.object || {};
  if (object.metadata?.base44_test_checkout === "true") return;

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    // A completed session is not proof of payment; only a paid session grants premium.
    if (object.payment_status !== "paid") return;
    const userId = object.client_reference_id || object.metadata?.user_id;
    if (!userId) return;
    const subscription = object.subscription
      ? await stripeGet(`subscriptions/${object.subscription}`, stripeKey).catch(() => null)
      : null;
    await applyPlan(service, userId, {
      plan: "premium",
      status: "active",
      priceAud: subscription?.items?.data?.[0]?.price?.unit_amount
        ? subscription.items.data[0].price.unit_amount / 100
        : PREMIUM_FALLBACK_PRICE,
      limit: limits.premium,
      reference: object.subscription || object.id,
      periodEnd: (subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end)
        ? new Date((subscription.current_period_end ?? subscription.items.data[0].current_period_end) * 1000).toISOString()
        : "",
    });
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    let userId = object.metadata?.user_id;
    if (!userId) {
      const match = await service.entities.Subscription
        .filter({ provider_reference: object.id }, { limit: 1 })
        .catch(() => ({ items: [] }));
      userId = match.items?.[0]?.user_id;
    }
    if (!userId) return;

    const active = ["active", "trialing"].includes(object.status);
    const grace = ["past_due", "incomplete"].includes(object.status);
    const priceAud = object.items?.data?.[0]?.price?.unit_amount
      ? object.items.data[0].price.unit_amount / 100
      : PREMIUM_FALLBACK_PRICE;

    await applyPlan(service, userId, {
      plan: active || grace ? "premium" : "free",
      status: active ? "active" : grace ? "pending_payment" : "active",
      priceAud: active || grace ? priceAud : 0,
      limit: active || grace ? limits.premium : limits.free,
      reference: object.id,
      periodEnd: (object.current_period_end ?? object.items?.data?.[0]?.current_period_end)
        ? new Date((object.current_period_end ?? object.items.data[0].current_period_end) * 1000).toISOString()
        : "",
      cancelAtPeriodEnd: active && Boolean(object.cancel_at_period_end),
    });
    return;
  }

  // invoice.payment_failed is covered by the subscription.updated event that follows it.
};

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request, context }) => {
        const signatureSecret = secrets.get("STRIPE_WEBHOOK_SECRET");
        const stripeKey = secrets.get("STRIPE_SECRET_KEY");
        if (!signatureSecret || !stripeKey) {
          return Response.json({ error: "Stripe is not configured" }, { status: 500 });
        }

        const payload = await request.text();
        const valid = await verifySignature(payload, request.headers.get("Stripe-Signature"), signatureSecret);
        if (!valid) return Response.json({ error: "Invalid signature" }, { status: 400 });

        let event;
        try {
          event = JSON.parse(payload);
        } catch {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        try {
          await handleEvent(context.getBase44().asServiceRole, event, stripeKey);
        } catch (error) {
          console.error("[stripe webhook]", event?.type, error?.message || error);
          return Response.json({ error: "Webhook handler failed" }, { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});