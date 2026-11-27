import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export const Route = createFileRoute("/_authed/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Admin — Resellr" }] }),
});

const TABS = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/listings", label: "Listings" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/moderation", label: "Moderation" },
  { to: "/admin/marketing", label: "Marketing" },
  { to: "/admin/settings", label: "Settings" },
];

function AdminLayout() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-7 w-7 text-muted-foreground" />
        <h1 className="mt-3 text-2xl font-extrabold">Administrators only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area manages users, listings and moderation. Your account does not have the admin role.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to the marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <p className="mono-pill">Platform administration</p>
      <h1 className="mt-2 text-3xl font-extrabold">Admin</h1>
      <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-border pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/admin" }}
            className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-5">
        <Outlet />
      </div>
    </div>
  );
}