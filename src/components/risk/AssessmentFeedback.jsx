import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestAssessmentReview } from "@/lib/api/enquiries";

export function AssessmentFeedback({ assessment }) {
  const request = useServerFn(requestAssessmentReview);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!assessment) return null;

  const status = assessment.review_status || "none";
  const decided = status === "reviewed" || status === "corrected";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Assessment accuracy
      </p>

      {status === "requested" && (
        <p className="mt-2 text-sm text-muted-foreground">
          A moderator has been asked to review this assessment. You can keep working the enquiry in the
          meantime — the decision is still yours.
        </p>
      )}

      {decided && (
        <p className="mt-2 text-sm text-muted-foreground">
          A moderator reviewed this assessment
          {assessment.reviewed_by ? ` (${assessment.reviewed_by})` : ""}.{" "}
          {assessment.level === "insufficient"
            ? "It now shows as insufficient information."
            : "The original reading stands."}
          {assessment.review_outcome ? ` ${assessment.review_outcome}` : ""}
        </p>
      )}

      {status === "none" && (
        <>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
            >
              <Flag className="h-3 w-3" /> Report an inaccurate assessment
            </button>
          ) : (
            <div className="mt-2">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={800}
                placeholder="What is wrong or unfair about this assessment?"
                className="text-sm"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (note.trim().length < 10) {
                      toast.error("Add a short explanation so a moderator can check it.");
                      return;
                    }
                    setBusy(true);
                    try {
                      await request({ data: { assessment_id: assessment.id, note: note.trim() } });
                      toast.success("Sent to a moderator for human review");
                      setOpen(false);
                      setNote("");
                      router.invalidate();
                    } catch (error) {
                      toast.error(error?.message || "The request could not be sent.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Send for review
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}