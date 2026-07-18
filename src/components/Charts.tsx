import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MentionsData } from "@/types";

// Chart series colors validated for the dark surface (dataviz six-checks):
// emerald #059669 (magnitude), sky #0284c7 (secondary/accent marks).
const SERIES = "#059669";
const SERIES_FILL = "rgba(5, 150, 105, 0.22)";
const GRID = "rgba(148, 163, 184, 0.12)";
const INK_MUTED = "hsl(217 15% 62%)";

const tooltipStyle: React.CSSProperties = {
  background: "hsl(222 40% 12%)",
  border: "1px solid hsl(221 30% 22%)",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(214 30% 92%)",
};

/** Daily mention volume across all tickers. */
export function MentionFrequencyChart({ data }: { data: MentionsData }) {
  const series = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const m of data.mentions) {
      const d = m.createdAt.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mention frequency</CardTitle>
        <CardDescription>Ticker mentions per day, all tickers</CardDescription>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: INK_MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: INK_MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: INK_MUTED, strokeDasharray: "3 3" }}
              formatter={(v: number) => [v, "mentions"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={SERIES}
              strokeWidth={2}
              fill={SERIES_FILL}
              activeDot={{ r: 4, fill: SERIES, stroke: "hsl(222 40% 10%)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** Top tickers by mention count — horizontal bars, single magnitude hue. */
export function TopTickersChart({
  data,
  onSelect,
}: {
  data: MentionsData;
  onSelect?: (ticker: string) => void;
}) {
  const rows = useMemo(
    () =>
      data.tickers.slice(0, 8).map((t) => ({
        ticker: `$${t.ticker}`,
        raw: t.ticker,
        count: t.count,
        sentiment: t.sentimentLabel,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top tickers</CardTitle>
        <CardDescription>By mention count — tap a bar to open the ticker</CardDescription>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 24, left: -8, bottom: 0 }}
            barCategoryGap="28%"
          >
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: INK_MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="ticker"
              width={64}
              interval={0}
              tick={{ fill: "hsl(214 30% 85%)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(148,163,184,0.06)" }}
              formatter={(v: number, _n, item) => [
                `${v} mentions · ${(item.payload as { sentiment: string }).sentiment}`,
                "",
              ]}
            />
            <Bar
              dataKey="count"
              fill={SERIES}
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              cursor={onSelect ? "pointer" : undefined}
              onClick={(entry) => onSelect?.((entry as unknown as { raw: string }).raw)}
            >
              {rows.map((r) => (
                <Cell key={r.raw} fill={SERIES} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** Compact per-ticker sparkline of mention counts + sentiment. */
export function TickerSparkline({
  history,
}: {
  history: { date: string; count: number; avgSentiment: number }[];
}) {
  const rows = history.map((h) => ({ ...h, date: h.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={rows} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: INK_MUTED, fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={28}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: INK_MUTED, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ stroke: INK_MUTED, strokeDasharray: "3 3" }}
          formatter={(v: number, name: string) =>
            name === "count" ? [v, "mentions"] : [v, "avg sentiment"]
          }
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={SERIES}
          strokeWidth={2}
          fill={SERIES_FILL}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
