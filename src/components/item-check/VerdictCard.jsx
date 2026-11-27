import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

const STYLES = {
  allowed: {
    label: "Can be listed",
    box: "border-primary/40 bg-primary/10",
    icon: ShieldCheck,
    iconTone: "text-primary",
  },
  needs_review: {
    label: "Needs a closer look",
    box: "border-warning/50 bg-warning/10",
    icon: ShieldAlert,
    iconTone: "text-warning",
  },
  blocked: {
    label: "Cannot be listed",
    box: "border-destructive/40 bg-destructive/10",
    icon: ShieldX,
    iconTone: "text-destructive",
  },
};

export default function VerdictCard({ result }) {
  const style = STYLES[result.verdict] || STYLES.needs_review;
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${style.box}`} role="status">
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconTone}`} />
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight">{style.label}</p>
          <p className="mt-1 text-sm leading-relaxed">{result.reason}</p>
        </div>
      </div>

      {result.issues?.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
          {result.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      {result.suggestion && (
        <p className="mt-3 rounded-lg bg-background/70 px-3 py-2 text-sm">
          <span className="font-medium">Try this: </span>
          {result.suggestion}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Automated guidance only. It does not authenticate the item and it is not a valuation.
      </p>
    </div>
  );
}