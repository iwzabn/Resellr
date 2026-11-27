export function BentoCard({ title, sub, children, footer }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>
      <div className="flex-1">{children}</div>
      {footer}
    </article>
  );
}