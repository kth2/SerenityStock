import { MessageSquareText, Hash, CalendarRange, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCompact } from "@/lib/utils";
import type { MentionsData } from "@/types";

export function StatCards({ data }: { data: MentionsData }) {
  const top = data.tickers[0];
  const stats = [
    {
      icon: MessageSquareText,
      label: "Tracked mentions",
      value: formatCompact(data.totalMentions),
      sub: `from ${formatCompact(data.totalTweets)} posts`,
    },
    {
      icon: Hash,
      label: "Tickers tracked",
      value: String(data.tickers.length),
      sub: `${data.digest.newTickers.length} new this week`,
    },
    {
      icon: CalendarRange,
      label: "Mentions (7d)",
      value: String(data.digest.totalMentions),
      sub: data.digest.window.from
        ? `${data.digest.window.from} → ${data.digest.window.to}`
        : "no window",
    },
    {
      icon: Crown,
      label: "Most mentioned",
      value: top ? `$${top.ticker}` : "—",
      sub: top ? `${top.count} mentions · ${top.sentimentLabel}` : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {s.value}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
