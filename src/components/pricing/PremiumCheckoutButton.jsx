import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  cancelPremiumSubscription,
  createBillingPortal,
  createPremiumCheckout,
  resumePremiumSubscription,
} from "@/lib/api/billing";

export function PremiumCheckoutButton({ price, justPaid = false }) {
  const { user, isLoadingAuth, navigateToLogin } = useAuth();
  const startCheckout = useServerFn(createPremiumCheckout);
  const cancelFn = useServerFn(cancelPremiumSubscription);
  const resumeFn = useServerFn(resumePremiumSubscription);
  const portalFn = useServerFn(createBillingPortal);
  const [plan, setPlan] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      const record = page?.items?.[0];
      const next = record?.plan || "free";
      setSubscription(record || null);
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

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "";

  const changeRenewal = async (cancel) => {
    setError("");
    setBusy(true);
    try {
      const result = await (cancel ? cancelFn({}) : resumeFn({}));
      setSubscription((current) => ({
        ...current,
        cancel_at_period_end: result.cancelAtPeriodEnd,
        current_period_end: result.currentPeriodEnd || current?.current_period_end,
      }));
    } catch (caught) {
      setError(caught?.message || "Your subscription could not be updated. Please try again.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  const openPortal = async () => {
    setError("");
    setBusy(true);
    try {
      const { url } = await portalFn({});
      window.location.assign(url);
    } catch (caught) {
      setError(caught?.message || "The billing portal could not be opened.");
      setBusy(false);
    }
  };

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
    const ending = Boolean(subscription?.cancel_at_period_end);
    const until = formatDate(subscription?.current_period_end);
    return (
      <div className="mt-6 rounded-lg border border-primary/40 bg-primary/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Check className="h-4 w-4 text-primary" /> You are on Premium
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {ending
            ? `Your subscription is cancelled. You keep Premium${until ? ` until ${until}` : " until the end of the paid period"}, then your account returns to Free.`
            : until
              ? `Renews on ${until}.`
              : "Your subscription renews monthly."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ending ? (
            <Button size="sm" disabled={busy} onClick={() => changeRenewal(false)}>
              {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}Keep Premium
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmOpen(true)}>
              Cancel subscription
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={openPortal}>
            Billing &amp; invoices
          </Button>
        </div>
        {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel your Premium subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                You won't be charged again. You keep Premium{until ? ` until ${until}` : " until the end of the period you've paid for"}.
                After that your account returns to Free and your listing allowance drops accordingly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Keep Premium</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  changeRenewal(true);
                }}
              >
                {busy ? "Cancelling…" : "Cancel subscription"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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