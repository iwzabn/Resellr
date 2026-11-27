import { riskMeta } from "@/lib/format";

export function RiskBadge({ level = "pending", confidence, className = "" }) {
  const meta = riskMeta[level] || riskMeta.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${meta.ring} ${meta.tone} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
      {typeof confidence === "number" && level !== "pending" && (
        <span className="text-[10px] opacity-70">{confidence}%</span>
      )}
    </span>
  );
}