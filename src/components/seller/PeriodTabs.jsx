import { Link } from "@tanstack/react-router";

const PERIODS = [7, 30, 90];

export function PeriodTabs({ period }) {
  return (
    <div className="flex rounded-lg border border-border bg-card p-0.5">
      {PERIODS.map((value) => (
        <Link
          key={value}
          to="/seller-analytics"
          search={{ period: value }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            Number(period) === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {value} days
        </Link>
      ))}
    </div>
  );
}