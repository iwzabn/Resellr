import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";

export function ReviewDialog({ sellerId, sellerLabel, listingId, open, onOpenChange }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (body.trim().length < 15) {
      setError("Describe your experience in at least 15 characters.");
      return;
    }
    setBusy(true);
    try {
      await base44.entities.Review.create({
        subject_user_id: sellerId,
        subject_label: sellerLabel || "Seller",
        listing_id: listingId || "",
        reviewer_id: user?.id || "",
        reviewer_name: user?.full_name || "Member",
        rating,
        body: body.trim(),
        status: "published",
      });
      toast.success("Review published", {
        description: "Reviews reflect one person's experience. They never change a risk assessment on their own.",
      });
      onOpenChange(false);
      setBody("");
    } catch (err) {
      setError(err?.message || "Your review could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Review {sellerLabel}</DialogTitle>
          <DialogDescription>
            Only review a transaction or interaction you actually had. Moderators can remove reviews
            that break the rules.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                className="p-1"
              >
                <Star
                  className={`h-6 w-6 ${value <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                />
              </button>
            ))}
            <span className="ml-1 font-mono text-xs text-muted-foreground">{rating}/5</span>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="What was the item like, how was communication and delivery?"
          />
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Publish review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}