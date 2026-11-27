import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateLocationPreference } from "@/lib/api/intelligence";
import { AU_REGIONS } from "@/lib/format";

const GRANULARITY = [
  { value: "region", label: "State / region only" },
  { value: "city", label: "City or suburb and region" },
];

export function LocationSharingCard({ preference, defaultCity = "", defaultRegion = "" }) {
  const save = useServerFn(updateLocationPreference);
  const router = useRouter();
  const [share, setShare] = useState(!!preference?.share_location);
  const [granularity, setGranularity] = useState(preference?.granularity === "hidden" ? "region" : preference?.granularity || "region");
  const [city, setCity] = useState(preference?.city || defaultCity || "");
  const [region, setRegion] = useState(preference?.region || defaultRegion || "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await save({ data: { share_location: share, granularity: share ? granularity : "hidden", city, region } });
      toast.success(share ? "Location sharing updated" : "Location sharing turned off");
      router.invalidate();
    } catch (error) {
      toast.error(error?.message || "That setting could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <MapPin className="h-3 w-3" /> Approximate location
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            When you contact a seller, they can see an approximate area to judge whether collection is
            practical. Your street address and live location are never shared, and this is never used
            to assess how trustworthy you are.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <Switch checked={share} onCheckedChange={setShare} aria-label="Share approximate location" />
          {share ? "Sharing" : "Off"}
        </label>
      </div>

      {share && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="location-granularity" className="text-xs">
              How precise
            </Label>
            <select
              id="location-granularity"
              value={granularity}
              onChange={(event) => setGranularity(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {GRANULARITY.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="location-city" className="text-xs">
              City or suburb
            </Label>
            <Input
              id="location-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Sydney"
              className="mt-1"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="location-region" className="text-xs">
              State / region
            </Label>
            <select
              id="location-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Not set</option>
              {AU_REGIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save location sharing
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Sellers see it marked as approximate and unverified.
        </p>
      </div>
    </div>
  );
}