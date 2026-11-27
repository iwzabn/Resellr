import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications — Resellr" }] }),
});

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Notification.list({ sort: "-created_date", limit: 50 })
      .then((page) => setItems(page.items || []))
      .catch(() => setItems([]));
  }, [user?.id]);

  const markAll = async () => {
    await base44.entities.Notification.updateMany({ user_id: user.id, is_read: false }, { $set: { is_read: true } });
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    toast.success("All notifications marked as read");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="mono-pill">Activity</p>
          <h1 className="mt-2 text-3xl font-extrabold">Notifications</h1>
        </div>
        {items?.some((item) => !item.is_read) && (
          <Button variant="outline" size="sm" onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>

      {items === null ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nothing yet. Enquiry and message updates appear here.</p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {items.map((item) => (
            <li key={item.id} className={item.is_read ? "" : "bg-accent/40"}>
              <Link to={item.link || "/dashboard"} className="block p-4 transition hover:bg-muted/50">
                <div className="flex items-start gap-2">
                  {!item.is_read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatDateTime(item.created_date)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}