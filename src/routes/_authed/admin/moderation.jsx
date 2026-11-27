import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { ReviewQueues } from "@/components/admin/ReviewQueues";
import { resolveReport } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/admin/moderation")({
  component: AdminModeration,
});

const VERIFICATIONS = ["unverified", "verified", "unsubstantiated"];
const ACTIONS = ["none", "warning", "listing_removed", "account_limited", "dismissed"];

function AdminModeration() {
  const resolve = useServerFn(resolveReport);
  const [reports, setReports] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ status: "under_review", verification: "unverified", action: "none", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    base44.entities.CommunityReport.list({ sort: "-created_date", limit: 50 })
      .then((page) => setReports(page.items || []))
      .catch(() => setReports([]));
    base44.entities.Review.list({ sort: "-created_date", limit: 20 })
      .then((page) => setReviews(page.items || []))
      .catch(() => setReviews([]));
    base44.entities.RiskAssessment.list({ sort: "-created_date", limit: 10 })
      .then((page) => setAssessments(page.items || []))
      .catch(() => setAssessments([]));
  };

  useEffect(load, []);

  const submit = async () => {
    if (!open) return;
    if (form.notes.trim().length < 10) {
      toast.error("Add a short note so the decision is auditable.");
      return;
    }
    setBusy(true);
    try {
      await resolve({
        data: {
          report_id: open.id,
          status: form.status,
          verification: form.verification,
          action: form.action,
          notes: form.notes.trim(),
        },
      });
      toast.success("Moderation decision recorded");
      setOpen(null);
      setForm({ status: "under_review", verification: "unverified", action: "none", notes: "" });
      load();
    } catch (err) {
      toast.error(err?.message || "The decision could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const moderateReview = async (review, status) => {
    await base44.entities.Review.update(review.id, { status });
    toast.success(status === "published" ? "Review published" : "Review removed");
    load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-bold">Report queue</h2>
          <p className="text-xs text-muted-foreground">
            Verify evidence before it can influence any risk assessment. Unverified reports never do.
          </p>
        </div>
        {!reports ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
          </p>
        ) : reports.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No reports submitted.</p>
        ) : (
          <ul className="divide-y divide-border">
            {reports.map((report) => (
              <li key={report.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {report.reason.replace(/_/g, " ")} · {report.target_label || report.target_id}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {report.target_type} · reported by {report.reporter_name} ·{" "}
                      {formatDateTime(report.created_date)}
                    </p>
                  </div>
                  <span className="mono-pill">{report.status.replace("_", " ")}</span>
                  <span className={`mono-pill ${report.verification === "verified" ? "border-primary/40 text-primary" : ""}`}>
                    {report.verification}
                  </span>
                  {report.risk_signal === "possible_mass_report" && (
                    <span className="mono-pill border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning">
                      possible mass report
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(report);
                      setForm({ status: "under_review", verification: "unverified", action: "none", notes: "" });
                    }}
                  >
                    Review
                  </Button>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{report.description}</p>
                {(report.evidence_urls || []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {report.evidence_urls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">
                        Evidence link
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReviewQueues />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-bold">Reviews</h2>
          </div>
          {reviews.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No reviews submitted.</p>
          ) : (
            <ul className="divide-y divide-border">
              {reviews.map((review) => (
                <li key={review.id} className="flex flex-wrap items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {review.rating}/5 · {review.subject_label || review.subject_user_id}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{review.body}</p>
                  </div>
                  <span className="mono-pill">{review.status}</span>
                  {review.status !== "published" ? (
                    <Button size="sm" variant="outline" onClick={() => moderateReview(review, "published")}>
                      Publish
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => moderateReview(review, "removed")}>
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-bold">AI assessment review</h2>
            <p className="text-xs text-muted-foreground">Outcomes to spot-check for quality and fairness.</p>
          </div>
          {assessments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No assessments generated yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {assessments.map((assessment) => (
                <li key={assessment.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/enquiries/$enquiryId"
                      params={{ enquiryId: assessment.enquiry_id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Open enquiry
                    </Link>
                    <RiskBadge level={assessment.level} confidence={assessment.confidence} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{assessment.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={!!open} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Review report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="rounded-md bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
              {open?.description}
            </p>
            <div>
              <Label className="text-xs">Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {["under_review", "resolved", "dismissed"].map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Verification</Label>
              <select
                value={form.verification}
                onChange={(e) => setForm({ ...form, verification: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {VERIFICATIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <select
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                {ACTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Moderator note</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1"
                placeholder="What the evidence showed and why you decided this."
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={busy}>
              Save decision
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}