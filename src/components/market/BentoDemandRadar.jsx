import { BentoCard } from "@/components/market/BentoCard";
import { RadarChart } from "@/components/market/RadarChart";

export function BentoDemandRadar({ points = [], now = 0, peak = 0, change = null }) {
  return (
    <BentoCard title="Demand shift" sub="Where enquiry pressure is moving">
      {points.length < 3 ? (
        <p className="py-6 text-sm text-muted-foreground">
          Not enough category activity yet to plot a demand shape. This fills in as listings and
          enquiries accumulate.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <RadarChart points={points} />
          <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:flex-1 sm:grid-cols-1">
            <Metric label="Enquiries 7d" value={now} />
            <Metric label="Previous 7d" value={peak} />
            <Metric label="Change" value={typeof change === "number" ? `${change > 0 ? "+" : ""}${change}%` : "—"} accent />
          </dl>
        </div>
      )}
    </BentoCard>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={`num font-display text-lg font-bold ${accent ? "text-primary" : ""}`}>{value}</dd>
    </div>
  );
}