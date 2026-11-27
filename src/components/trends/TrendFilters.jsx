import { useNavigate } from "@tanstack/react-router";
import { useCategories } from "@/hooks/use-categories";

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const COUNTRIES = ["", "Australia", "New Zealand"];

export function TrendFilters({ period, category, country }) {
  const navigate = useNavigate();
  const categories = useCategories();

  const update = (patch) =>
    navigate({
      to: "/trends",
      search: {
        period: patch.period ?? period,
        category: patch.category ?? category,
        country: patch.country ?? country,
      },
    });

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border border-border bg-card p-0.5">
        {PERIODS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => update({ period: option.value })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              Number(period) === option.value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <select
        value={category || ""}
        onChange={(event) => update({ category: event.target.value })}
        className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
        aria-label="Filter trends by category"
      >
        <option value="">All categories</option>
        {categories.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </select>

      <select
        value={country || ""}
        onChange={(event) => update({ country: event.target.value })}
        className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
        aria-label="Filter trends by country"
      >
        {COUNTRIES.map((option) => (
          <option key={option || "all"} value={option}>
            {option || "All countries"}
          </option>
        ))}
      </select>
    </div>
  );
}