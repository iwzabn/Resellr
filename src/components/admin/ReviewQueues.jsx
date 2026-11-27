import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { getModerationQueues, resolveAppeal, resolveAssessmentReview } from "@/lib/api/intelligence";
import { formatDateTime } from "@/lib/format";

export function ReviewQueues() {
  const loadQueues = useServerFn(getModerationQueues);
  const reviewAssessment = useServerFn(resolveAssessmentReview);
  const decideAppeal = useServerFn(resolveAppeal);

  const [queues, setQueues] = useState(null);
  const [openAssessment, setOpenAssessment] = useState(null);
  const [assessmentNote, setAssessmentNote] = useState("");
  const [openAppeal, setOpenAppeal] = useState(null);
  const [appealNote, setAppealNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    loadQueues()
      .then(setQueues)
      .catch(() => setQueues({ assessments: [], appeals: [] }));
  };

  useEffect(load, []);

  const submitAssessment = async (outcome, setLevel) => {
    if (!openAssessment) return;
    if (assessmentNote.trim().length < 10) {
      toast.error("Add a short note explaining the review outcome.");
      return;
    }
    setBusy(true);
    try {
      await reviewAssessment({
        data: {
          assessment_id: openAssessment.id,
          outcome,
          note: assessmentNote.trim(),
          set_level: setLevel ? "insufficient" : "keep",
        },
      });
      toast.success("Assessment review recorded");
      setOpenAssessment(null);
      setAssessmentNote("");
      load();
    } catch (error) {
      toast.error(error?.message || "The review could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const submitAppeal = async (decision) => {
    if (!openAppeal) return;
    if (appealNote.trim().length < 10) {
      toast.error("Add the reason for this decision.");
      return;
    }
    setBusy(true);
    try {
      await decideAppeal({ data: { case_id: openAppeal.id, decision, note: appealNote.trim() } });
      toast.success(decision === "upheld" ? "Appeal upheld" : "Appeal denied");
      setOpenAppeal(null);
      setAppealNote("");
      load();
    } catch (error) {
      toast.error(error?.message || "The decision could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  if (!queues) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading review queues…
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Disputed AI assessments</h2>
          <p className="text-xs text-muted-foreground">
            Sellers asked for a human check. Confirm the assessment or reset it to insufficient
            information.
          </p>
        </div>
        {queues.assessments.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No assessment disputes waiting.</p>
        ) : (
          <ul className="divide-y divide-border">
            {queues.assessments.map((row) => (
              <li key={row.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/enquiries/$enquiryId"
                    params={{ enquiryId: row.enquiry_id }}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline"
                  >
                    Open enquiry
                  </Link>
                  <RiskBadge level={row.level} confidence={row.confidence} />
                  <span className="mono-pill">{row.review_status}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.summary}</p>
                {row.review_note && (
                  <p className="mt-1 rounded bg-muted/60 p-2 text-[11px] text-muted-foreground">
                    Seller's note: {row.review_note}
                  </p>
                )}
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpenAssessment(row)}>
                  Review assessment
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Appeals</h2>
          <p className="text-xs text-muted-foreground">
            Upholding an appeal lifts the restriction automatically and notifies the member.
          </p>
        </div>
        {queues.appeals.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No appeals submitted.</p>
        ) : (
          <ul className="divide-y divide-border">
            {queues.appeals.map((row) => (
              <li key={row.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.subject_label || row.subject_id} · {row.action.replace(/_/g, " ")}
                  </p>
                  <span className="mono-pill">{row.appeal_status}</span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {row.decided_at ? formatDateTime(row.decided_at) : formatDateTime(row.created_date)}
                </p>
                <p className="mt-1 rounded bg-muted/60 p-2 text-[11px] text-muted-foreground">
                  {row.appeal_note || "No note supplied."}
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpenAppeal(row)}>
                  Decide appeal
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openAssessment && (
        <div className="rounded-xl border border-primary/40 bg-accent p-4 lg:col-span-2">
          <p className="text-sm font-medium">Review assessment</p>
          <Textarea
            value={assessmentNote}
            onChange={(event) => setAssessmentNote(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="What the evidence showed and why the assessment stands or changes."
            className="mt-2 bg-card"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => submitAssessment("reviewed", false)} disabled={busy}>
              Assessment stands
            </Button>
            <Button size="sm" variant="outline" onClick={() => submitAssessment("corrected", true)} disabled={busy}>
              Set to insufficient information
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpenAssessment(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {openAppeal && (
        <div className="rounded-xl border border-primary/40 bg-accent p-4 lg:col-span-2">
          <p className="text-sm font-medium">Appeal: {openAppeal.subject_label || openAppeal.subject_id}</p>
          <Textarea
            value={appealNote}
            onChange={(event) => setAppealNote(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Reason for upholding or denying the appeal."
            className="mt-2 bg-card"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => submitAppeal("upheld")} disabled={busy}>
              Uphold appeal
            </Button>
            <Button size="sm" variant="outline" onClick={() => submitAppeal("denied")} disabled={busy}>
              Deny appeal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpenAppeal(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}