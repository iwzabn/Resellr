import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VerdictCard from "@/components/item-check/VerdictCard";
import { useCategories } from "@/hooks/use-categories";
import { checkItemPublic } from "@/lib/api/item-check";

export default function ItemCheckForm() {
  const categories = useCategories();
  const runCheck = useServerFn(checkItemPublic);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    if (title.trim().length < 3) {
      setError("Add the item name first.");
      return;
    }
    setBusy(true);
    try {
      const check = await runCheck({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          category_slug: category || undefined,
          brand: brand.trim() || undefined,
        },
      });
      setResult(check);
    } catch (err) {
      setError(err?.message || "The check could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="check-title">Item name</Label>
            <Input
              id="check-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Nike Air Max 90 · US 10 · Triple White"
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="check-category">Category</Label>
            <select
              id="check-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
            >
              <option value="">Not sure</option>
              {categories.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="check-brand">Brand</Label>
            <Input
              id="check-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              maxLength={60}
              placeholder="Nike"
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="check-description">What is it, and what condition is it in?</Label>
            <Textarea
              id="check-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={1200}
              placeholder="Genuine pair bought from the Nike store in 2023, worn twice, box included."
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{description.length}/1200</p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-4 w-full" disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {busy ? "Checking this item" : "Check this item"}
        </Button>
      </form>

      {result && <VerdictCard result={result} />}
    </div>
  );
}