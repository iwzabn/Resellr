import { AlertTriangle, Check, HelpCircle, Info, ShieldQuestion } from "lucide-react";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { riskMeta } from "@/lib/format";

const evidenceLabel = {
  verified: { text: "Verified by platform", className: "border-primary/40 bg-primary/10 text-primary" },
  unverified: { text: "Unverified report", className: "border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning" },
  context: { text: "Context only", className: "border-border bg-muted text-muted-foreground" },
};

export function RiskPanel({ assessment, loading, compact = false }) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Gathering evidence…
        </p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <RiskBadge level="pending" />
        <p className="mt-3 text-sm text-muted-foreground">
          No assessment has been recorded for this enquiry yet. You can still review the details and
          respond.
        </p>
      </div>
    );
  }

  const meta = riskMeta[assessment.level] || riskMeta.insufficient;
  const Icon = assessment.level === "caution" ? AlertTriangle : assessment.level === "low" ? Check : ShieldQuestion;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            AI transaction intelligence
          </p>
          <RiskBadge level={assessment.level} confidence={assessment.confidence} />
        </div>
        <div className={`mt-3 flex items-start gap-2 rounded-lg border p-3 ${meta.ring}`}>
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
          <p className="text-sm leading-relaxed text-foreground">{assessment.summary}</p>
        </div>
        {typeof assessment.confidence === "number" && (
          <div className="mt-3">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Confidence</span>
              <span>{assessment.confidence}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${assessment.confidence}%` }} />
            </div>
          </div>
        )}
      </div>

      {(assessment.factors || []).length > 0 && (
        <div className="border-b border-border p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Evidence considered
          </p>
          <ul className="mt-2 space-y-2.5">
            {(assessment.factors || []).map((factor, index) => {
              const chip = evidenceLabel[factor.evidence_type] || evidenceLabel.context;
              return (
                <li key={`${factor.label}-${index}`} className="rounded-lg border border-border p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{factor.label}</span>
                    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${chip.className}`}>
                      {chip.text}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{factor.detail}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(assessment.missing_info || []).length > 0 && (
        <div className={compact ? "p-4" : "border-b border-border p-4"}>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <HelpCircle className="h-3 w-3" /> What is still unknown
          </p>
          <ul className="mt-2 space-y-1.5">
            {(assessment.missing_info || []).map((item, index) => (
              <li key={index} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {assessment.generated_reason && (
        <div className="border-t border-border p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Why this was generated
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{assessment.generated_reason}</p>
          {assessment.verification_note && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Optional verification: {assessment.verification_note}.
            </p>
          )}
          {assessment.location_note && (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Location on file: {assessment.location_note}. Never used to score the buyer.
            </p>
          )}
        </div>
      )}

      <div className="space-y-1.5 p-4">
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Advisory only. New accounts are never assumed to be risky and no area is ever scored.
          Absence of reports is not a guarantee. You decide whether to proceed.
        </p>
        {assessment.evidence_counts && (
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/80">
            {assessment.evidence_counts}
          </p>
        )}
      </div>
    </div>
  );
}