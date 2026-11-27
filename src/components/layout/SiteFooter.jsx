import { Link } from "@tanstack/react-router";

const columns = [
  {
    title: "Marketplace",
    links: [
      { to: "/marketplace", label: "Browse all listings" },
      { to: "/marketplace", label: "Shoes & sneakers", search: { category: "shoes" } },
      { to: "/marketplace", label: "Electronics", search: { category: "electronics" } },
      { to: "/marketplace", label: "Collectibles", search: { category: "collectibles" } },
    ],
  },
  {
    title: "Selling",
    links: [
      { to: "/sell", label: "Create a listing" },
      { to: "/item-check", label: "AI item check" },
      { to: "/pricing", label: "Membership plans" },
      { to: "/dashboard", label: "Seller dashboard" },
      { to: "/analytics", label: "Market analytics" },
    ],
  },
  {
    title: "Trust & safety",
    links: [
      { to: "/trust", label: "How risk assessments work" },
      { to: "/reports", label: "Report a problem" },
      { to: "/trust", label: "Prohibited products" },
      { to: "/trust", label: "Privacy & data handling" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-extrabold tracking-tight">
            Resellr<span className="text-primary">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            A reseller marketplace where sellers stay in control of every transaction, with market
            intelligence behind each decision.
          </p>
          <p className="mono-pill mt-4">Built for AU · expanding globally</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {column.title}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    search={link.search}
                    className="text-sm text-foreground/80 transition hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © 2026 Resellr. Listings are created by independent sellers. Risk assessments are advisory
        only and never guarantee a transaction is safe.
      </div>
    </footer>
  );
}