import { SlidersHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AU_REGIONS, CONDITION_OPTIONS } from "@/lib/format";
import { useCategories } from "@/hooks/use-categories";

const SORTS = [
  ["newest", "Newest first"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
  ["popular", "Most viewed"],
];

export function FilterBar({ search, onApply, resultCount, hasMore }) {
  const categories = useCategories();
  const set = (key, value) => onApply({ ...search, [key]: value || undefined });

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {resultCount}
          {hasMore ? "+" : ""} live {resultCount === 1 && !hasMore ? "listing" : "listings"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-7">
        <div className="col-span-2 lg:col-span-1">
          <Label className="text-[11px] text-muted-foreground">Category</Label>
          <select
            value={search.category || ""}
            onChange={(e) => set("category", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-base sm:text-sm"
          >
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Condition</Label>
          <select
            value={search.condition || ""}
            onChange={(e) => set("condition", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-base sm:text-sm"
          >
            <option value="">Any</option>
            {CONDITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">State</Label>
          <select
            value={search.region || ""}
            onChange={(e) => set("region", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-base sm:text-sm"
          >
            <option value="">Australia</option>
            {AU_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Label className="text-[11px] text-muted-foreground">Min $</Label>
            <Input
              inputMode="numeric"
              value={search.min || ""}
              onChange={(e) => set("min", e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 h-10"
              placeholder="0"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Label className="text-[11px] text-muted-foreground">Max $</Label>
            <Input
              inputMode="numeric"
              value={search.max || ""}
              onChange={(e) => set("max", e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 h-10"
              placeholder="Any"
            />
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Brand</Label>
          <Input
            value={search.brand || ""}
            onChange={(e) => set("brand", e.target.value)}
            className="mt-1 h-10"
            placeholder="Any"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Sort</Label>
          <select
            value={search.sort || "newest"}
            onChange={(e) => set("sort", e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-base sm:text-sm"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}