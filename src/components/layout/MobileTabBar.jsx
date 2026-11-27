import { Link } from "@tanstack/react-router";
import { Home, Inbox, Plus, Search, User } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/marketplace", label: "Browse", Icon: Search },
  { to: "/enquiries", label: "Enquiries", Icon: Inbox },
  { to: "/profile", label: "Account", Icon: User },
];

export function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2">
        {tabs.slice(0, 2).map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
        <Link
          to="/sell"
          aria-label="Sell an item"
          className="mx-auto -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        >
          <Plus className="h-6 w-6" />
        </Link>
        {tabs.slice(2).map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ to, label, Icon }) {
  return (
    <Link
      to={to}
      className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}