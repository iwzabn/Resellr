import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { submitReport } from "@/lib/api/admin";

const REASONS = [
  { value: "suspected_scam", label: "Suspected scam" },
  { value: "misleading_listing", label: "Misleading listing" },
  { value: "counterfeit_product", label: "Counterfeit product" },
  { value: "failed_transaction", label: "Failed transaction" },
  { value: "delivery_issue", label: "Delivery issue" },
  { value: "unsafe_arrangement", label: "Unsafe transaction arrangement" },
];

export function ReportDialog({ targetType, targetId, targetLabel, open, onOpenChange }) {
  const submit = useServerFn(submitReport);
  const [reason, setReason] = useState(REASONS[0].value);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (description.trim().length < 20) {
      setError("Please describe what happened in at least 20 characters so moderators can assess it.");
      return;
    }
    setSubmitting(true);
    try {
      const urls = evidence
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter((value) => /^https?:\/\//.test(value))
        .slice(0, 5);
      const result = await submit({
        data: {
          target_type: targetType,
          target_id: targetId,
          target_label: targetLabel,
          reason,
          description: description.trim(),
          evidence_urls: urls,
        },
      });
      toast.success("Report submitted", { description: result.message });
      onOpenChange(false);
      setDescription("");
      setEvidence("");
    } catch (err) {
      setError(err?.message || "We could not submit that report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Report a problem</DialogTitle>
          <DialogDescription>
            Reports stay unverified until a moderator reviews the evidence. They never automatically
            change anyone's reputation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="report-reason">What happened?</Label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
            >
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="report-description">Details</Label>
            <Textarea
              id="report-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Facts only: what was agreed, what happened, and what you can show."
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="report-evidence" className="text-xs">
              Evidence links (optional)
            </Label>
            <Input
              id="report-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Links to screenshots or photos"
              className="mt-1.5"
            />
          </div>
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="outline" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit report for review
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}