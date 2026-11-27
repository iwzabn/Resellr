import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createEnquiry } from "@/lib/api/enquiries";
import { formatPrice } from "@/lib/format";

const ARRANGEMENTS = [
  "Meet in person to inspect first",
  "Post after payment",
  "Collection from seller",
  "Not decided yet",
];

export function EnquiryDialog({ listing, open, onOpenChange }) {
  const navigate = useNavigate();
  const send = useServerFn(createEnquiry);
  const [message, setMessage] = useState("");
  const [arrangement, setArrangement] = useState(ARRANGEMENTS[0]);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (message.trim().length < 10) {
      setError("Add a little detail so the seller can help — at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await send({
        data: {
          listing_id: listing.id,
          message: message.trim(),
          arrangement,
          buyer_city: city.trim() || undefined,
          buyer_region: region.trim() || undefined,
        },
      });
      toast.success("Enquiry sent to the seller");
      onOpenChange(false);
      setMessage("");
      navigate({ to: "/enquiries/$enquiryId", params: { enquiryId: result.enquiry_id } });
    } catch (err) {
      setError(err?.message || "We could not send that enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Message the seller</DialogTitle>
          <DialogDescription>
            {listing.title} · {formatPrice(listing.price, listing.currency)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="enquiry-message">Your message</Label>
            <Textarea
              id="enquiry-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Is this still available? Would you take $170 with pickup on Saturday?"
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{message.length}/2000</p>
          </div>

          <div>
            <Label htmlFor="enquiry-arrangement">How do you want to handle it?</Label>
            <select
              id="enquiry-arrangement"
              value={arrangement}
              onChange={(e) => setArrangement(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
            >
              {ARRANGEMENTS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="enquiry-city" className="text-xs">
                Approximate city
              </Label>
              <Input
                id="enquiry-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sydney"
                className="mt-1.5"
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="enquiry-region" className="text-xs">
                State / region
              </Label>
              <Input
                id="enquiry-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="NSW"
                className="mt-1.5"
                maxLength={60}
              />
            </div>
          </div>

          <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Only this approximate area is shared with the seller. Never send your street address,
            live location or bank details through messages.
          </p>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending and assessing…
              </>
            ) : (
              "Send enquiry"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}