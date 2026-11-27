import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/api/admin";

const KEY = "premium_stripe_price_id";

export default function StripePriceSetting() {
  const audit = useServerFn(logAudit);
  const [record, setRecord] = useState(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.PlatformSetting.filter({ key: KEY }, { limit: 1 })
      .then((page) => {
        const row = page.items?.[0] || null;
        setRecord(row);
        setValue(row?.text_value || "");
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const text_value = value.trim();
      if (record) {
        await base44.entities.PlatformSetting.update(record.id, { text_value });
        setRecord({ ...record, text_value });
      } else {
        const created = await base44.entities.PlatformSetting.create({
          key: KEY,
          label: "Stripe price ID (Premium monthly)",
          description: "The Stripe price checkout charges for Premium.",
          text_value,
        });
        setRecord(created);
      }
      await audit({
        data: { action: "settings.updated", target_type: "setting", target_id: KEY },
      });
      toast.success("Stripe price ID saved");
    } catch (err) {
      toast.error(err?.message || "The price ID could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_150px_90px] sm:items-end">
      <div>
        <Label htmlFor="stripe_price_id" className="text-xs">
          Stripe price charged for Premium
        </Label>
        <p className="text-[11px] text-muted-foreground">
          The monthly price ID checkout uses (starts with price_). Changing it here changes what members
          are charged, with no code change.
        </p>
      </div>
      <Input
        id="stripe_price_id"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="price_..."
      />
      <Button variant="outline" onClick={save} disabled={busy || !value.trim()}>
        Save
      </Button>
    </div>
  );
}