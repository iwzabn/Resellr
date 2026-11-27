import { Minus, TrendingDown, TrendingUp } from "lucide-react";

const TONES = {
  up: "border-primary/40 bg-primary/10 text-primary",
  down: "border-destructive/40 bg-destructive/10 text-destructive",
  flat: "border-border bg-muted text-muted-foreground",
};

export function MomentumChip({ value }) {
  if (value === null || value === undefined) {
    return <span className="mono-pill">no baseline</span>;
  }
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONES[direction]}`}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

const STRENGTH = {
  insufficient: { label: "Too little data", className: "border-border bg-muted text-muted-foreground" },
  early: { label: "Early signal", className: "border-warning/50 bg-warning/15 text-warning-foreground dark:text-warning" },
  moderate: { label: "Moderate signal", className: "border-primary/30 bg-accent text-accent-foreground" },
  strong: { label: "Strong signal", className: "border-primary/40 bg-primary/10 text-primary" },
};

export function StrengthBadge({ strength, confidence }) {
  const meta = STRENGTH[strength] || STRENGTH.insufficient;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${meta.className}`}
    >
      {meta.label}
      {typeof confidence === "number" && confidence > 0 ? ` · ${confidence}%` : ""}
    </span>
  );
}