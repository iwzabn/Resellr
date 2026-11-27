import { Link } from "@tanstack/react-router";
import {
  Armchair,
  Bike,
  Blocks,
  BookOpen,
  Footprints,
  Gamepad2,
  Gem,
  Monitor,
  Package,
  Palette,
  Shirt,
  Smartphone,
  Sparkles,
  Wrench,
} from "lucide-react";

const ICONS = {
  Armchair,
  Bike,
  Blocks,
  BookOpen,
  Footprints,
  Gamepad2,
  Gem,
  Monitor,
  Package,
  Palette,
  Shirt,
  Smartphone,
  Sparkles,
  Wrench,
};

export function CategoryStrip({ categories = [] }) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold">Popular categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every permitted category, with subcategories managed by our moderators.
          </p>
        </div>
        <Link to="/marketplace" className="text-sm font-medium text-primary hover:underline">
          Browse everything →
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-7">
        {categories.map((category) => {
          const Icon = ICONS[category.icon] || Package;
          return (
            <Link
              key={category.slug}
              to="/marketplace"
              search={{ category: category.slug }}
              className="group rounded-xl border border-border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
            >
              <Icon className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
              <p className="mt-2 text-sm font-medium leading-tight">{category.name}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-primary/80 opacity-0 transition group-hover:opacity-100">
                Browse →
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}