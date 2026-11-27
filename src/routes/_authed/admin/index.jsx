import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/seller/StatTile";
import { purgeDemoData } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const purge = useServerFn(purgeDemoData);
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.User.list(),
      base44.entities.Listing.count({}),
      base44.entities.Listing.count({ status: "active" }),
      base44.entities.Enquiry.count({}),
      base44.entities.CommunityReport.count({ status: "pending" }),
      base44.entities.Subscription.count({ plan: "premium" }),
      base44.entities.AuditLog.list({ sort: "-created_date", limit: 20 }),
    ])
      .then(([users, listings, active, enquiries, pendingReports, premium, logs]) => {
        setStats({
          users: users.length,
          listings,
          active,
          enquiries,
          pendingReports,
          premium,
        });
        setAudit(logs.items || []);
      })
      .catch(() => setStats({ users: 0, listings: 0, active: 0, enquiries: 0, pendingReports: 0, premium: 0 }));
  };

  useEffect(load, []);

  const removeDemo = async () => {
    setBusy(true);
    try {
      const result = await purge();
      toast.success(`Purged ${result.listings} demo listings and ${result.events} demo events`);
      load();
    } catch (err) {
      toast.error(err?.message || "Demo data could not be purged.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!stats ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading platform figures…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Registered users" value={stats.users} />
            <StatTile label="Active listings" value={stats.active} note={`${stats.listings} total`} />
            <StatTile label="Enquiries" value={stats.enquiries} />
            <StatTile label="Premium members" value={stats.premium} tone="primary" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Reports awaiting review
              </p>
              <p className="num mt-1 font-display text-2xl font-extrabold">{stats.pendingReports}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Unverified reports never affect risk assessments until you review them.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Demonstration data
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Sample listings and analytics events are flagged as demo. Purge them before opening the
                marketplace to real users.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={removeDemo} disabled={busy}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Purge demo data
              </Button>
            </div>
          </div>
        </>
      )}

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Audit log</h2>
          <p className="text-xs text-muted-foreground">
            Administrative actions recorded with the actor and target.
          </p>
        </div>
        {audit.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No admin actions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="mono-pill">{entry.action}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {entry.actor_name} · {entry.target_type || "platform"} {entry.target_id ? `#${entry.target_id.slice(-6)}` : ""}{" "}
                  {entry.detail ? `· ${entry.detail}` : ""}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDateTime(entry.created_date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}