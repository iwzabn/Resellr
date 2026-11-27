import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/api/admin";

export const Route = createFileRoute("/_authed/admin/categories")({
  component: AdminCategories,
});

const ICON_CHOICES = [
  "Package",
  "Shirt",
  "Footprints",
  "Monitor",
  "Smartphone",
  "Gamepad2",
  "Gem",
  "Blocks",
  "Armchair",
  "Bike",
  "Wrench",
  "Sparkles",
  "BookOpen",
  "Palette",
];

function AdminCategories() {
  const audit = useServerFn(logAudit);
  const [categories, setCategories] = useState(null);
  const [form, setForm] = useState({ name: "", slug: "", parent_slug: "", icon: "Package", description: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.Category.list({ sort: "sort_order", limit: 100 })
      .then((page) => setCategories(page.items || []))
      .catch(() => setCategories([]));
  }, []);

  const create = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error("Give the category a name.");
    const slug = (form.slug || form.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setBusy(true);
    try {
      const created = await base44.entities.Category.create({
        name: form.name.trim(),
        slug,
        parent_slug: form.parent_slug.trim(),
        icon: form.icon,
        description: form.description.trim(),
        is_active: true,
        sort_order: (categories?.length || 0) + 1,
      });
      await audit({ data: { action: "category.created", target_type: "category", target_id: created.id, detail: created.name } });
      setCategories((current) => [...current, created]);
      setForm({ name: "", slug: "", parent_slug: "", icon: "Package", description: "" });
      toast.success("Category created");
    } catch (err) {
      toast.error(err?.message || "The category could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (category) => {
    await base44.entities.Category.update(category.id, { is_active: !category.is_active });
    await audit({
      data: { action: category.is_active ? "category.disabled" : "category.enabled", target_type: "category", target_id: category.id },
    });
    setCategories((current) =>
      current.map((row) => (row.id === category.id ? { ...row, is_active: !row.is_active } : row)),
    );
  };

  const remove = async (category) => {
    await base44.entities.Category.delete(category.id);
    await audit({ data: { action: "category.deleted", target_type: "category", target_id: category.id, detail: category.name } });
    setCategories((current) => current.filter((row) => row.id !== category.id));
    toast.success("Category deleted");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        {!categories ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {category.name}
                    {category.parent_slug ? (
                      <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground">
                        in {category.parent_slug}
                      </span>
                    ) : null}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {category.slug} · order {category.sort_order ?? 0}
                  </p>
                </div>
                <span className={`mono-pill ${category.is_active ? "text-primary" : ""}`}>
                  {category.is_active ? "active" : "hidden"}
                </span>
                <Button size="sm" variant="outline" onClick={() => toggle(category)}>
                  {category.is_active ? "Hide" : "Show"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(category)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={create} className="h-fit rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          New category
        </p>
        <div className="mt-3 space-y-2.5">
          <div>
            <Label htmlFor="cat-name" className="text-xs">Name</Label>
            <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cat-slug" className="text-xs">Slug (optional)</Label>
            <Input id="cat-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="generated from name" />
          </div>
          <div>
            <Label htmlFor="cat-parent" className="text-xs">Parent category slug (optional)</Label>
            <Input id="cat-parent" value={form.parent_slug} onChange={(e) => setForm({ ...form, parent_slug: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="cat-icon" className="text-xs">Icon</Label>
            <select
              id="cat-icon"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {ICON_CHOICES.map((icon) => (
                <option key={icon}>{icon}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            <Plus className="mr-1.5 h-4 w-4" /> Create category
          </Button>
        </div>
      </form>
    </div>
  );
}