import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/marketing")({
  component: AdminMarketing,
});

function AdminMarketing() {
  const audit = useServerFn(logAudit);
  const [ads, setAds] = useState([]);
  const [sponsored, setSponsored] = useState([]);
  const [form, setForm] = useState({ title: "", body: "", target_url: "", placement: "homepage_banner", advertiser_name: "" });

  const load = () => {
    base44.entities.Advertisement.list({ sort: "-created_date", limit: 40 })
      .then((page) => setAds(page.items || []))
      .catch(() => setAds([]));
    base44.entities.Listing.filter({ is_sponsored: true }, { limit: 20 })
      .then((page) => setSponsored(page.items || []))
      .catch(() => setSponsored([]));
  };

  useEffect(load, []);

  const create = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 3) return toast.error("Give the advert a title.");
    try {
      const created = await base44.entities.Advertisement.create({
        ...form,
        status: "active",
        starts_at: new Date().toISOString(),
        is_demo: false,
      });
      await audit({ data: { action: "advert.created", target_type: "advert", target_id: created.id, detail: created.title } });
      toast.success("Advert created — it is labelled as sponsored wherever it appears");
      setForm({ title: "", body: "", target_url: "", placement: "homepage_banner", advertiser_name: "" });
      load();
    } catch (err) {
      toast.error(err?.message || "The advert could not be created.");
    }
  };

  const setStatus = async (ad, status) => {
    await base44.entities.Advertisement.update(ad.id, { status });
    await audit({ data: { action: `advert.${status}`, target_type: "advert", target_id: ad.id, detail: ad.title } });
    load();
  };

  const unsponsor = async (listing) => {
    await base44.entities.Listing.update(listing.id, { is_sponsored: false });
    await audit({ data: { action: "listing.unsponsored", target_type: "listing", target_id: listing.id } });
    load();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-bold">Adverts</h2>
            <p className="text-xs text-muted-foreground">
              Every placement is labelled sponsored. Never advertise prohibited products or services.
            </p>
          </div>
          {ads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No adverts created.</p>
          ) : (
            <ul className="divide-y divide-border">
              {ads.map((ad) => (
                <li key={ad.id} className="flex flex-wrap items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ad.title}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {ad.placement} · {ad.status} · {ad.advertiser_name || "unattributed"} ·{" "}
                      {formatDate(ad.created_date)}
                    </p>
                  </div>
                  {ad.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(ad, "paused")}>
                      Pause
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setStatus(ad, "active")}>
                      Activate
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(ad, "ended")}>
                    End
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-bold">Sponsored listings</h2>
          </div>
          {sponsored.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No sponsored listings. Sponsor a listing from the Listings tab.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sponsored.map((listing) => (
                <li key={listing.id} className="flex items-center gap-2 p-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{listing.title}</span>
                  <Button size="sm" variant="ghost" onClick={() => unsponsor(listing)}>
                    Unsponsor
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <form onSubmit={create} className="h-fit rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">New advert</p>
        <div className="mt-3 space-y-2.5">
          <div>
            <Label htmlFor="ad-title" className="text-xs">Title</Label>
            <Input id="ad-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ad-body" className="text-xs">Body</Label>
            <Input id="ad-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ad-url" className="text-xs">Target URL</Label>
            <Input id="ad-url" value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} className="mt-1" placeholder="https://" />
          </div>
          <div>
            <Label htmlFor="ad-advertiser" className="text-xs">Advertiser</Label>
            <Input id="ad-advertiser" value={form.advertiser_name} onChange={(e) => setForm({ ...form, advertiser_name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ad-placement" className="text-xs">Placement</Label>
            <select
              id="ad-placement"
              value={form.placement}
              onChange={(e) => setForm({ ...form, placement: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="homepage_banner">Homepage banner</option>
              <option value="category_boost">Category placement</option>
              <option value="rail">Rail placement</option>
            </select>
          </div>
          <Button type="submit" className="w-full">
            Create advert
          </Button>
        </div>
      </form>
    </div>
  );
}