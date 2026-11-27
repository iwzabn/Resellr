import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

export function ActivityChart({ data }) {
  const hasData = (data || []).some((row) => row.views > 0 || row.enquiries > 0);

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="max-w-xs px-4 text-center text-xs leading-relaxed text-muted-foreground">
          No marketplace activity recorded in the last 14 days yet.
        </p>
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => String(value).slice(5)}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--card))",
              color: "hsl(var(--card-foreground))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="views" name="Listing views" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="enquiries" name="Enquiries" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}