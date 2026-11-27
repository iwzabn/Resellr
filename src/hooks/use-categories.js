import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const FALLBACK = [
  { slug: "fashion", name: "Fashion & clothing" },
  { slug: "shoes", name: "Shoes & sneakers" },
  { slug: "electronics", name: "Electronics" },
  { slug: "phones", name: "Phones & accessories" },
  { slug: "computers", name: "Computers & gaming" },
  { slug: "collectibles", name: "Collectibles & cards" },
  { slug: "toys", name: "Toys & hobbies" },
  { slug: "home", name: "Home & furniture" },
  { slug: "sports", name: "Sports & outdoors" },
  { slug: "automotive", name: "Automotive & tools" },
  { slug: "beauty", name: "Beauty & personal care" },
  { slug: "books", name: "Books & entertainment" },
  { slug: "art", name: "Art & handmade" },
  { slug: "other", name: "Other permitted products" },
];

// Active categories as administrators have configured them, with a static
// fallback so search never renders without options.
export function useCategories() {
  const [categories, setCategories] = useState(FALLBACK);

  useEffect(() => {
    base44.entities.Category
      .filter({ is_active: true }, { sort: "sort_order", limit: 100 })
      .then((page) => {
        const items = (page.items || []).map((row) => ({ slug: row.slug, name: row.name }));
        if (items.length) setCategories(items);
      })
      .catch(() => null);
  }, []);

  return categories;
}