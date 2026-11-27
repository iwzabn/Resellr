import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { createPremiumCheckout } from "@/lib/api/billing";

export function PremiumCheckoutButton({ price, justPaid = false }) {
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const startCheckout = useServerFn(createPremiumCheckout);
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setPlan(null);
      return;
    }
    let cancelled = false;
    let timer;
    const load = async (attempt = 0) => {
      const page = await base44.entities.Subscription
        .filter({ user_id: user.id }, { limit: 1 })
        .catch(() => null);
      if (cancelled) return;
      const next = page?.items?.[0]?.plan || "free";
      setPlan(next);
      // Stripe confirms the payment a moment after checkout returns, so keep checking briefly.
      if (justPaid && next !== "premium" && attempt < 8) {
        timer = setTimeout(() => load(attempt + 1), 2500);
      }
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.id, justPaid]);

  const handleCheckout = async () => {
    setError("");
    const framed = window.self !== window.top;
    const checkoutTab = framed ? window.open("", "_blank") : null;
    if (framed && !checkoutTab) {
      setError("Allow popups to continue to checkout.");
      return;
    }
    if (checkoutTab) checkoutTab.opener = null;

    setBusy(true);
    try {
      const { url } = await startCheckout({});
      if (checkoutTab) checkoutTab.location.replace(url);
      else window.location.assign(url);
    } catch (caught) {
      checkoutTab?.close();
      setError(caught?.message || "Checkout could not be started.");
      setBusy(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <Button disabled variant="outline" className="mt-6 w-full">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking your plan
      </Button>
    );
  }

  if (plan === "premium") {
    return (
      <div className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Check className="h-4 w-4 text-primary" /> You are on Premium
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Manage or cancel the subscription from the billing portal link in your Stripe receipt email.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Button
        className="w-full"
        disabled={busy}
        onClick={user ? handleCheckout : () => navigateToLogin()}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening secure checkout
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {user ? `Upgrade to Premium` : "Sign in to upgrade"}
          </>
        )}
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {user ? "Secure checkout powered by Stripe. Cancel any time." : "You need a free account to subscribe."}
      </p>
      {error && <p className="mt-2 text-center text-[11px] text-destructive">{error}</p>}
    </div>
  );
}