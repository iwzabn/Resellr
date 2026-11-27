import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/api/admin";
import StripePriceSetting from "@/components/admin/StripePriceSetting";

export const Route = createFileRoute("/_authed/admin/settings")({
  component: AdminSettings,
});

const DEFAULTS = [
  { key: "listing_limit_free", label: "Free plan listing limit", number_value: 5, description: "Active listings a free member may hold." },
  { key: "listing_limit_premium", label: "Premium listing limit", number_value: 50, description: "Active listings a premium member may hold." },
  { key: "premium_price_aud", label: "Premium price (AUD per month)", number_value: 9.99, description: "Displayed on the plans page." },
];

function AdminSettings() {
  const audit = useServerFn(logAudit);
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.PlatformSetting.list({ limit: 50 })
      .then((page) => {
        const rows = page.items || [];
        const merged = DEFAULTS.map((fallback) => rows.find((row) => row.key === fallback.key) || fallback);
        setSettings(merged);
      })
      .catch(() => setSettings(DEFAULTS));
  }, []);

  const save = async (setting) => {
    setBusy(true);
    try {
      if (setting.id) {
        await base44.entities.PlatformSetting.update(setting.id, {
          number_value: Number(setting.number_value),
          label: setting.label,
        });
      } else {
        await base44.entities.PlatformSetting.create({
          key: setting.key,
          label: setting.label,
          description: setting.description,
          number_value: Number(setting.number_value),
        });
      }
      await audit({
        data: { action: "settings.updated", target_type: "setting", target_id: setting.key, detail: `${setting.number_value}` },
      });
      toast.success(`${setting.label} saved`);
    } catch (err) {
      toast.error(err?.message || "The setting could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (!settings) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Plans and listing limits</h2>
        <p className="text-xs text-muted-foreground">
          These numbers drive the limit checks when members create listings.
        </p>
        <div className="mt-3 space-y-3">
          {settings.map((setting, index) => (
            <div key={setting.key} className="grid gap-2 sm:grid-cols-[1fr_140px_90px] sm:items-end">
              <div>
                <Label htmlFor={setting.key} className="text-xs">
                  {setting.label}
                </Label>
                <p className="text-[11px] text-muted-foreground">{setting.description}</p>
              </div>
              <Input
                id={setting.key}
                inputMode="decimal"
                value={setting.number_value}
                onChange={(e) =>
                  setSettings((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, number_value: e.target.value.replace(/[^0-9.]/g, "") } : row,
                    ),
                  )
                }
              />
              <Button variant="outline" onClick={() => save(setting)} disabled={busy}>
                Save
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Payments</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Premium subscriptions are billed monthly through Stripe. The premium price above is the amount
          shown on the plans page; the field below is the Stripe price that checkout actually charges, so
          both should be kept in step.
        </p>
        <div className="mt-3">
          <StripePriceSetting />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Prohibited products</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Illegal goods, counterfeits, weapons, age-restricted products, prescription medicines, live
          animals, stolen goods, recalled products, personal data and financial instruments are not
          permitted. The public trust and safety page explains the policy, and listings can be removed
          from the Listings tab with an audit entry.
        </p>
      </section>
    </div>
  );
}