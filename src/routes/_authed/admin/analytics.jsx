import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { StatTile } from "@/components/seller/StatTile";
import { ActivityChart } from "@/components/admin/ActivityChart";
import { getAdminAnalytics } from "@/lib/api/intelligence";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/analytics")({
  loader: () => getAdminAnalytics(),
  component: AdminAnalytics,
  head: () => ({ meta: [{ title: "Platform analytics — Resellr" }] }),
});

function Panel({ title, sub, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}

function Bar({ label, value, peak, suffix = "" }) {
  const width = peak ? Math.max(4, Math.round((value / peak) * 100)) : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <span className="truncate">{label}</span>
        <span className="num ml-2 shrink-0 font-mono text-[11px] text-muted-foreground">
          {value.toLocaleString("en-AU")}
          {suffix}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}

function AdminAnalytics() {
  const data = Route.useLoaderData();
  const categoryPeak = Math.max(...data.categories.map((row) => row.listings), 1);
  const regionPeak = Math.max(...data.regions.map((row) => row.count), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Registered users" value={data.users_total} note={`${data.users_admins} admins`} />
        <StatTile label="Active users (30d)" value={data.users_active_30d} note="Sent an enquiry or listed" />
        <StatTile label="Active listings" value={data.listings_active} note={`${data.listings_total} total · ${data.listings_removed} removed`} />
        <StatTile label="Enquiries" value={data.enquiries_total} note={`${data.enquiries_30d} in the last 30 days`} tone="primary" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Enquiries accepted" value={data.enquiries_accepted} note={`${data.enquiries_pending} awaiting a decision`} />
        <StatTile label="Messages sent" value={data.messages_total} note="Count only, content not read here" />
        <StatTile label="Premium members" value={data.subscriptions.premium} note={`${data.subscriptions.free} free accounts`} />
        <StatTile label="Reports pending" value={data.reports.pending} note={`${data.reports.total} reports all time`} />
      </div>

      <Panel title="Platform activity" sub="Listing views and enquiries recorded per day over the last 14 days">
        <div className="mt-3">
          <ActivityChart data={data.activity} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Most listed categories" sub="Active listings per category">
          {data.categories.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No active listings.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {data.categories.map((row) => (
                <Bar key={row.label} label={row.label} value={row.listings} peak={categoryPeak} suffix=" listed" />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Most active regions" sub="Active listings per region. Aggregated only, no personal data.">
          {data.regions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No region data recorded on listings yet.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {data.regions.map((row) => (
                <Bar key={row.label} label={row.label} value={row.count} peak={regionPeak} suffix=" listed" />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Moderation" sub="Decisions recorded by moderators">
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <li className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Verified reports</p>
              <p className="num mt-0.5 text-lg font-bold">{data.reports.verified}</p>
            </li>
            <li className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Unverified</p>
              <p className="num mt-0.5 text-lg font-bold">{data.reports.unverified}</p>
            </li>
            <li className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Listings removed</p>
              <p className="num mt-0.5 text-lg font-bold">{data.moderation.listings_removed}</p>
            </li>
            <li className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Accounts limited</p>
              <p className="num mt-0.5 text-lg font-bold">{data.moderation.accounts_limited}</p>
            </li>
            <li className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Warnings issued</p>
              <p className="num mt-0.5 text-lg font-bold">{data.moderation.warnings}</p>
            </li>
            <li className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Appeals open</p>
              <p className="num mt-0.5 text-lg font-bold">{data.moderation.appeals_open}</p>
            </li>
          </ul>
        </Panel>

        <Panel title="Advertising" sub="Sponsored placements currently configured">
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Active ads</p>
              <p className="num mt-0.5 text-lg font-bold">
                {data.ads.active}/{data.ads.total}
              </p>
            </div>
            <div className="rounded-lg border border-border p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Sponsored listing views</p>
              <p className="num mt-0.5 text-lg font-bold">{data.sponsored_views.toLocaleString("en-AU")}</p>
            </div>
          </div>
          <ul className="mt-2 space-y-1">
            {data.ads.by_placement.map((row) => (
              <li key={row.placement} className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{row.placement.replace("_", " ")}</span>
                <span className="font-mono">{row.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{data.ads.impressions_note}</p>
        </Panel>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {data.completed_sales_note} Figures are aggregates only: private messages, precise locations and
        personal details are not exposed here. Figures generated {formatDateTime(data.generated_at)}.
      </p>
    </div>
  );
}