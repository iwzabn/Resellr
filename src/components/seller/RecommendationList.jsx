import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Info, Lightbulb, X } from "lucide-react";
import { dismissRecommendation } from "@/lib/api/intelligence";

const KIND_LABEL = {
  title: "Title",
  description: "Description",
  pricing: "Pricing",
  category: "Category",
  interest: "Interest",
};

export function RecommendationList({ recommendations }) {
  const dismiss = useServerFn(dismissRecommendation);
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  if (!recommendations || recommendations.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        No suggestions right now. Once you have listings with views and enquiries, data-based
        suggestions appear here.
      </p>
    );
  }

  const handleDismiss = async (row) => {
    setBusyId(row.id || row.title);
    try {
      if (row.id) await dismiss({ data: { id: row.id } });
      router.invalidate();
    } catch (error) {
      toast.error(error?.message || "That suggestion could not be dismissed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ul className="mt-3 space-y-2.5">
      {recommendations.map((row, index) => {
        const key = row.id || `${row.title}-${index}`;
        return (
          <li key={key} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.detail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDismiss(row)}
                disabled={busyId === key}
                className="text-muted-foreground transition hover:text-destructive disabled:opacity-50"
                aria-label="Dismiss suggestion"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="mono-pill">{KIND_LABEL[row.kind] || row.kind}</span>
              {row.is_estimate && (
                <span className="mono-pill border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning">
                  <Info className="h-3 w-3" /> Estimate
                </span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Basis: {row.basis}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}