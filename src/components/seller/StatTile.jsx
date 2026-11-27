export function StatTile({ label, value, note, tone = "default" }) {
  const toneClass =
    tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`num mt-1.5 font-display text-2xl font-extrabold ${toneClass}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}