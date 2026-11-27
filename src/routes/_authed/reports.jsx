import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StandingCard } from "@/components/account/StandingCard";
import { appealReport } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "My reports — Resellr" }] }),
});

const tone = {
  pending: "border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning",
  under_review: "border-border bg-muted text-muted-foreground",
  resolved: "border-primary/40 bg-primary/10 text-primary",
  dismissed: "border-border bg-muted text-muted-foreground",
};

function ReportsPage() {
  const appeal = useServerFn(appealReport);
  const [reports, setReports] = useState(null);
  const [appealing, setAppealing] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.CommunityReport.list({ sort: "-created_date", limit: 50 })
      .then((page) => setReports(page.items || []))
      .catch(() => setReports([]));
  }, []);

  const submitAppeal = async () => {
    if (!appealing || note.trim().length < 20) {
      toast.error("Add at least 20 characters explaining the appeal.");
      return;
    }
    setBusy(true);
    try {
      await appeal({ data: { report_id: appealing.id, note: note.trim() } });
      setReports((current) =>
        current.map((item) => (item.id === appealing.id ? { ...item, appeal_status: "submitted" } : item)),
      );
      toast.success("Appeal submitted for moderator review");
      setAppealing(null);
      setNote("");
    } catch (err) {
      toast.error(err?.message || "The appeal could not be submitted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <p className="mono-pill">Trust & safety</p>
      <h1 className="mt-2 text-3xl font-extrabold">My reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reports stay unverified until a moderator reviews the evidence. You can appeal the outcome of
        any report you made, and any decision taken against your account.
      </p>

      <div className="mt-4">
        <StandingCard />
      </div>

      {reports === null ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-bold">No reports submitted</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You can report a listing or an account from its page.
          </p>
          <Link to="/marketplace" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {reports.map((report) => (
            <li key={report.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {report.reason.replace(/_/g, " ")} · {report.target_label || report.target_id}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${tone[report.status]}`}>
                    {report.status.replace("_", " ")}
                  </span>
                  <span className="mono-pill">{report.verification}</span>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{report.description}</p>
              {report.resolution_note && (
                <p className="mt-2 rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
                  Moderator note: {report.resolution_note}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDate(report.created_date)} · appeal {report.appeal_status}
                </p>
                {report.appeal_status === "none" && report.status !== "pending" && (
                  <Button variant="outline" size="sm" onClick={() => setAppealing(report)}>
                    Appeal outcome
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {appealing && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-accent p-4">
          <p className="text-sm font-medium">Appeal: {appealing.target_label || appealing.target_id}</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Explain what the moderator should reconsider, and link any new evidence."
            className="mt-2 bg-card"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={submitAppeal} disabled={busy}>
              Submit appeal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAppealing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}