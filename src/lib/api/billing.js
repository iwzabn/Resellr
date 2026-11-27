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