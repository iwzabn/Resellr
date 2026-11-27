import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { appealModeration, getMyStanding } from "@/lib/api/intelligence";
import { formatDate } from "@/lib/format";

const COPY = {
  clear: {
    tone: "border-primary/40 bg-primary/10",
    icon: ShieldCheck,
    title: "No moderation decisions on your account",
    body: "You have no warnings or restrictions. Reports about you only count once a moderator verifies them.",
  },
  warning: {
    tone: "border-warning/50 bg-warning/15",
    icon: ShieldAlert,
    title: "You have a moderation warning",
    body: "A warning on its own does not restrict your account. You can appeal it below.",
  },
  restricted: {
    tone: "border-warning/50 bg-warning/15",
    icon: ShieldAlert,
    title: "Your account is restricted",
    body: "Some marketplace actions are limited. You can appeal the decision below.",
  },
  suspended: {
    tone: "border-destructive/40 bg-destructive/10",
    icon: ShieldAlert,
    title: "Your account is suspended",
    body: "New enquiries and listings are blocked while the suspension stands. You can appeal below.",
  },
};

export function StandingCard() {
  const load = useServerFn(getMyStanding);
  const appeal = useServerFn(appealModeration);
  const [standing, setStanding] = useState(null);
  const [appealing, setAppealing] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    load()
      .then(setStanding)
      .catch(() => setStanding({ standing: "clear", active: [], warnings: [] }));
  };

  useEffect(refresh, []);

  if (!standing) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your standing…
      </p>
    );
  }

  const copy = COPY[standing.standing] || COPY.clear;
  const decisions = [...standing.active, ...standing.warnings];
  const Icon = copy.icon;

  const submit = async () => {
    if (!appealing) return;
    if (note.trim().length < 20) {
      toast.error("Add at least 20 characters explaining the appeal.");
      return;
    }
    setBusy(true);
    try {
      await appeal({ data: { case_id: appealing.id, note: note.trim() } });
      toast.success("Appeal submitted for moderator review");
      setAppealing(null);
      setNote("");
      refresh();
    } catch (error) {
      toast.error(error?.message || "The appeal could not be submitted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`rounded-xl border p-4 ${copy.tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{copy.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>
      </div>

      {decisions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {decisions.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium capitalize">{row.action.replace(/_/g, " ")}</p>
                <span className="mono-pill">{row.appeal_status === "none" ? "no appeal" : `appeal ${row.appeal_status}`}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{row.notes}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {formatDate(row.decided_at)}
                </p>
                {row.appeal_status === "none" && (
                  <Button size="sm" variant="outline" onClick={() => setAppealing(row)}>
                    Appeal decision
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {appealing && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium">Appeal against: {appealing.action.replace(/_/g, " ")}</p>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="What should the moderator reconsider, and what evidence supports it?"
            className="mt-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={submit} disabled={busy}>
              Submit appeal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAppealing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}