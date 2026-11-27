import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { logAudit } from "@/lib/api/admin";
import { RestrictAccountDialog } from "@/components/admin/RestrictAccountDialog";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const audit = useServerFn(logAudit);
  const [users, setUsers] = useState(null);
  const [subs, setSubs] = useState({});
  const [term, setTerm] = useState("");
  const [moderating, setModerating] = useState(null);

  const loadSubs = () => {
    base44.entities.Subscription.list({ limit: 200 })
      .then((page) => {
        const map = {};
        (page.items || []).forEach((row) => {
          map[row.user_id] = row;
        });
        setSubs(map);
      })
      .catch(() => setSubs({}));
  };

  useEffect(() => {
    base44.entities.User.list()
      .then((rows) => setUsers(rows || []))
      .catch(() => setUsers([]));
    loadSubs();
  }, []);

  const setPlan = async (user, plan) => {
    const existing = subs[user.id];
    const payload = {
      plan,
      status: "active",
      listing_limit: plan === "premium" ? 50 : 5,
      price_aud: plan === "premium" ? 9.99 : 0,
    };
    try {
      if (existing) {
        await base44.entities.Subscription.update(existing.id, payload);
      } else {
        await base44.entities.Subscription.create({ user_id: user.id, ...payload });
      }
      await audit({
        data: { action: `subscription.${plan}`, target_type: "user", target_id: user.id, detail: user.email },
      });
      toast.success(`${user.email} moved to the ${plan} plan`);
      loadSubs();
    } catch (err) {
      toast.error(err?.message || "The plan could not be changed.");
    }
  };

  const changeRole = async (user, role) => {
    try {
      await base44.entities.User.update(user.id, { role });
      await audit({ data: { action: `user.role.${role}`, target_type: "user", target_id: user.id, detail: user.email } });
      setUsers((current) => current.map((row) => (row.id === user.id ? { ...row, role } : row)));
      toast.success(`${user.email} is now ${role}`);
    } catch (err) {
      toast.error(err?.message || "The role could not be changed.");
    }
  };

  if (!users) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
      </p>
    );
  }

  const visible = users.filter((user) => {
    const haystack = `${user.full_name || ""} ${user.email || ""}`.toLowerCase();
    return haystack.includes(term.trim().toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search by name or email" className="pl-9" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2 font-normal">Member</th>
              <th className="px-2 py-2 font-normal">Joined</th>
              <th className="px-2 py-2 font-normal">Role</th>
              <th className="px-2 py-2 font-normal">Plan</th>
              <th className="px-4 py-2 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{user.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="px-2 py-2.5 text-xs text-muted-foreground">{formatDate(user.created_date)}</td>
                <td className="px-2 py-2.5">
                  <span className={`mono-pill ${user.role === "admin" ? "border-primary/40 text-primary" : ""}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <button
                    type="button"
                    onClick={() => setPlan(user, subs[user.id]?.plan === "premium" ? "free" : "premium")}
                    className={`mono-pill ${subs[user.id]?.plan === "premium" ? "border-primary/40 text-primary" : ""}`}
                  >
                    {subs[user.id]?.plan || "free"}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => setModerating(user)}
                    className="mb-1 block w-full text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Moderate
                  </button>
                  {user.role === "admin" ? (
                    <button
                      type="button"
                      onClick={() => changeRole(user, "user")}
                      className="text-xs font-medium text-muted-foreground hover:text-destructive"
                    >
                      Remove admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => changeRole(user, "admin")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Make admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Admins can see and change all data and manage users. Invite new members from the platform's App
        Users page.
      </p>

      <RestrictAccountDialog
        member={moderating || {}}
        open={!!moderating}
        onOpenChange={(open) => !open && setModerating(null)}
        onDone={() => setModerating(null)}
      />
    </div>
  );
}