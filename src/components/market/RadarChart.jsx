// Six-axis demand radar. Rendered as static SVG so the server and client markup match.
export function RadarChart({ points, size = 180 }) {
  const center = size / 2;
  const radius = size / 2 - 26;
  const count = points.length;

  const coord = (index, value) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return [center + Math.cos(angle) * radius * value, center + Math.sin(angle) * radius * value];
  };

  const rings = [0.33, 0.66, 1].map((scale) =>
    points.map((_, i) => coord(i, scale).join(",")).join(" "),
  );
  const shape = points.map((p, i) => coord(i, Math.max(p.value, 0.08)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[200px]" role="img" aria-label="Category demand share">
      {rings.map((ring, i) => (
        <polygon key={i} points={ring} className="fill-none stroke-border" strokeWidth="1" />
      ))}
      {points.map((p, i) => {
        const [x, y] = coord(i, 1);
        return <line key={p.axis} x1={center} y1={center} x2={x} y2={y} className="stroke-border" strokeWidth="1" />;
      })}
      <polygon points={shape} className="fill-primary/20 stroke-primary" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => {
        const [x, y] = coord(i, Math.max(p.value, 0.08));
        return <circle key={`${p.axis}-dot`} cx={x} cy={y} r="2.6" className="fill-primary" />;
      })}
      {points.map((p, i) => {
        const [x, y] = coord(i, 1.22);
        return (
          <text
            key={`${p.axis}-label`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground font-mono text-[7px] uppercase"
          >
            {p.axis}
          </text>
        );
      })}
    </svg>
  );
}