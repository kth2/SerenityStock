import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MentionsData } from "@/types";

export function DailyDigest({
  data,
  onSelect,
}: {
  data: MentionsData;
  onSelect: (ticker: string) => void;
}) {
  const { digest } = data;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <CardTitle>Weekly digest</CardTitle>
        </div>
        <CardDescription>
          {digest.window.from
            ? `${digest.window.from} → ${digest.window.to} · ${digest.totalMentions} mentions`
            : "No recent activity"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Most discussed
          </h4>
          <div className="flex flex-wrap gap-2">
            {digest.topTickers.map((t) => (
              <button
                key={t.ticker}
                onClick={() => onSelect(t.ticker)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                <span className="text-accent">${t.ticker}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  ×{t.count}
                </span>
              </button>
            ))}
            {digest.topTickers.length === 0 && (
              <span className="text-sm text-muted-foreground">Nothing yet</span>
            )}
          </div>
        </div>
        {digest.newTickers.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New this week
            </h4>
            <div className="flex flex-wrap gap-2">
              {digest.newTickers.map((t) => (
                <Badge key={t} variant="accent" className="cursor-pointer" onClick={() => onSelect(t)}>
                  ${t}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
