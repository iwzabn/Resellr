import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { secrets } from "base44:runtime";
import { requireUser } from "@/lib/auth-middleware";

// Server-owned price: the buyer never supplies an amount, currency or plan. The
// Stripe price is read from PlatformSetting so it can be changed from the admin
// settings page without a code change.
const PREMIUM_PRICE_KEY = "premium_stripe_price_id";

export const createPremiumCheckout = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const headers = getRequest().headers;
    const proto = headers.get("x-forwarded-proto") || "https";
    const origin = process.env.APP_URL || `${proto}://${headers.get("host")}`;
    if (!headers.get("host") && !process.env.APP_URL) {
      throw new Error("Checkout is unavailable right now. Please try again shortly.");
    }

    const stripeKey = secrets.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Payments are not configured yet.");

    const settingsPage = await context
      .getBase44()
      .asServiceRole.entities.PlatformSetting.filter({ key: PREMIUM_PRICE_KEY }, { limit: 1 })
      .catch(() => ({ items: [] }));
    const premiumPriceId = settingsPage.items?.[0]?.text_value;
    if (!premiumPriceId) throw new Error("Payments are not configured yet.");

    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": premiumPriceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/pricing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      client_reference_id: context.user.id,
      "metadata[user_id]": context.user.id,
      "subscription_data[metadata][user_id]": context.user.id,
    });
    if (context.user.email) body.set("customer_email", context.user.email);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Stripe-Version": "2025-10-29.clover",
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body,
    });
    const session = await response.json();
    if (!response.ok) {
      console.error("[stripe checkout]", session?.error?.message);
      throw new Error(session?.error?.message || "Checkout could not be started.");
    }

    return { url: session.url };
  });

// ---- Managing an existing subscription ------------------------------------------------------

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2025-10-29.clover";

const stripeCall = async (method, path, key, body) => {
  const response = await fetch(`${STRIPE_API}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const json = await response.json();
  if (!response.ok) {
    console.error("[stripe]", path, json?.error?.message);
    throw new Error(json?.error?.message || "Stripe could not complete that request.");
  }
  return json;
};

// The signed-in user's own Stripe subscription, or an error. The id comes from our own record
// (written by the verified webhook), and is checked against the subscription's owner in Stripe.
const ownSubscription = async (context) => {
  const stripeKey = secrets.get("STRIPE_SECRET_KEY");
  if (!stripeKey) throw new Error("Payments are not configured yet.");
  const service = context.getBase44().asServiceRole;
  const page = await service.entities.Subscription
    .filter({ user_id: context.user.id }, { limit: 1 })
    .catch(() => ({ items: [] }));
  const record = page.items?.[0];
  const id = record?.provider_reference;
  if (!record || record.plan !== "premium" || typeof id !== "string" || !id.startsWith("sub_")) {
    throw new Error("There is no active Premium subscription on this account.");
  }
  const subscription = await stripeCall("GET", `subscriptions/${id}`, stripeKey);
  if (subscription.metadata?.user_id !== context.user.id) {
    throw new Error("There is no active Premium subscription on this account.");
  }
  return { service, record, subscription, stripeKey };
};

const periodEndOf = (subscription) => {
  const seconds = subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : "";
};

const setCancelAtPeriodEnd = async (context, cancel) => {
  const { service, record, subscription, stripeKey } = await ownSubscription(context);
  const updated = await stripeCall(
    "POST",
    `subscriptions/${subscription.id}`,
    stripeKey,
    new URLSearchParams({ cancel_at_period_end: cancel ? "true" : "false" }),
  );
  const current_period_end = periodEndOf(updated) || record.current_period_end || "";
  await service.entities.Subscription.update(record.id, {
    cancel_at_period_end: Boolean(updated.cancel_at_period_end),
    current_period_end,
  });
  return { cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end), currentPeriodEnd: current_period_end };
};

// Ends renewal. Premium stays until the paid period runs out; the webhook then downgrades the account.
export const cancelPremiumSubscription = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => setCancelAtPeriodEnd(context, true));

// Undoes a cancellation that has not taken effect yet.
export const resumePremiumSubscription = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => setCancelAtPeriodEnd(context, false));

// Stripe's hosted billing portal (payment method, invoices). Needs the portal switched on in Stripe.
export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const { subscription, stripeKey } = await ownSubscription(context);
    const headers = getRequest().headers;
    const proto = headers.get("x-forwarded-proto") || "https";
    const origin = process.env.APP_URL || `${proto}://${headers.get("host")}`;
    const session = await stripeCall(
      "POST",
      "billing_portal/sessions",
      stripeKey,
      new URLSearchParams({ customer: String(subscription.customer), return_url: `${origin}/pricing` }),
    );
    return { url: session.url };
  });
