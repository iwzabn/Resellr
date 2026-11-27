import { useCountUp } from "@/hooks/use-count-up";

export function BentoHero({ listings, delta, share }) {
  const live = useCountUp(listings || 0);
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (circumference * (share || 0)) / 100;

  return (
    <div className="grid items-center gap-4 rounded-[2rem] border border-border bg-background px-5 py-4 transition hover:border-primary/30 sm:grid-cols-[auto_1fr_auto] sm:gap-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Active listings
        </p>
        <p className="num mt-1 font-display text-4xl font-extrabold leading-none sm:text-5xl">
          {live.toLocaleString("en-AU")}
        </p>
      </div>
      <p className="flex flex-wrap items-baseline gap-2 text-sm text-foreground">
        {typeof delta === "number" ? (
          <>
            <span className="font-mono text-xs text-primary">
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
            <span className="text-muted-foreground">new listings vs the previous week</span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Week-on-week comparison starts once there is a full second week of listings.
          </span>
        )}
      </p>
      <div className="relative h-[64px] w-[64px]" role="img" aria-label={`${share || 0}% of listings have enquiries`}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r="34" className="fill-none stroke-border" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="34"
            className="fill-none stroke-primary"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-medium">
          {share || 0}%
        </span>
      </div>
    </div>
  );
}