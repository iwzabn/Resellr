import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Image } from "@/components/ui/image";
import { CONDITION_OPTIONS, DELIVERY_OPTIONS, AU_REGIONS } from "@/lib/format";

const emptyForm = {
  title: "",
  description: "",
  price: "",
  category_slug: "",
  subcategory: "",
  condition: "Like new",
  brand: "",
  stock: "1",
  city: "",
  region: "",
  delivery_options: ["Collection"],
  images: [],
};

export function ListingForm({ initial, submitLabel, onSubmit, busy, error, limit, usage }) {
  const [form, setForm] = useState({ ...emptyForm, ...(initial || {}) });
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.entities.Category
      .filter({ is_active: true }, { sort: "sort_order", limit: 60 })
      .then((page) => setCategories(page.items || []))
      .catch(() => setCategories([]));
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggleDelivery = (option) => {
    setForm((current) => ({
      ...current,
      delivery_options: current.delivery_options.includes(option)
        ? current.delivery_options.filter((item) => item !== option)
        : [...current.delivery_options, option],
    }));
  };

  const uploadImages = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 6 - form.images.length);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is over 8 MB`);
          continue;
        }
        const result = await base44.integrations.Core.UploadPublicFile({ file });
        if (result?.file_url) urls.push(result.file_url);
      }
      setForm((current) => ({ ...current, images: [...current.images, ...urls].slice(0, 6) }));
    } catch {
      toast.error("That photo could not be uploaded. Try a smaller JPG or PNG.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = (url) => set("images", form.images.filter((image) => image !== url));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      price: Number(form.price),
      stock: Number(form.stock) || 1,
      category_name: categories.find((c) => c.slug === form.category_slug)?.name || form.category_slug,
    });
  };

  const atLimit = limit !== undefined && usage !== undefined && usage >= limit;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {atLimit && (
        <p className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm">
          You have reached your {limit} active listing allowance. Pause a listing, or upgrade on the plans
          page for a higher allowance.
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Item</p>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="listing-title">Title</Label>
            <Input
              id="listing-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Nike Air Max 90 · US 10 · Triple White"
              className="mt-1.5"
              maxLength={120}
              required
            />
          </div>
          <div>
            <Label htmlFor="listing-description">Description</Label>
            <Textarea
              id="listing-description"
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Condition details, measurements, what's included, why you're selling."
              className="mt-1.5"
              maxLength={4000}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="listing-price">Price (AUD)</Label>
              <Input
                id="listing-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set("price", e.target.value.replace(/[^0-9.]/g, ""))}
                className="mt-1.5"
                required
              />
            </div>
            <div>
              <Label htmlFor="listing-condition">Condition</Label>
              <select
                id="listing-condition"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="listing-stock">Stock</Label>
              <Input
                id="listing-stock"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => set("stock", e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="listing-category">Category</Label>
              <select
                id="listing-category"
                value={form.category_slug}
                onChange={(e) => set("category_slug", e.target.value)}
                className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                required
              >
                <option value="">Choose…</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="listing-subcategory">Subcategory</Label>
              <Input
                id="listing-subcategory"
                value={form.subcategory}
                onChange={(e) => set("subcategory", e.target.value)}
                placeholder="e.g. Running shoes"
                className="mt-1.5"
                maxLength={60}
              />
            </div>
            <div>
              <Label htmlFor="listing-brand">Brand</Label>
              <Input
                id="listing-brand"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Nike"
                className="mt-1.5"
                maxLength={60}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Photos · up to 6
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {form.images.map((url) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <Image src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute right-1 top-1 rounded bg-card/90 px-1.5 py-0.5 text-[10px] font-medium"
              >
                Remove
              </button>
            </div>
          ))}
          {form.images.length < 6 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:text-primary">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-[10px]">Add photo</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={uploadImages} />
            </label>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Photos are stored publicly — anyone with the link can open them, so don't include personal
          documents or your address.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Location and delivery
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="listing-city">City or suburb</Label>
            <Input
              id="listing-city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Sydney"
              className="mt-1.5"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="listing-region">State / region</Label>
            <select
              id="listing-region"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
            >
              <option value="">Choose…</option>
              {AU_REGIONS.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-sm font-medium">Delivery options</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DELIVERY_OPTIONS.map((option) => {
                const active = form.delivery_options.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleDelivery(option)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Only this general area is shown publicly. Buyers never receive a precise address from us.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={busy || uploading}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}