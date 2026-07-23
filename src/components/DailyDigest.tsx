import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalBadge } from "@/components/Signals";
import { useI18n } from "@/lib/i18n";
import type { MentionsData } from "@/types";

export function DailyDigest({
  data,
  onSelect,
}: {
  data: MentionsData;
  onSelect: (ticker: string) => void;
}) {
  const { t } = useI18n();
  const { digest } = data;
  const topSignal = [...data.tickers]
    .filter((x) => typeof x.signalScore === "number")
    .sort((a, b) => (b.signalScore ?? 0) - (a.signalScore ?? 0))
    .slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <CardTitle>{t("digest.title")}</CardTitle>
        </div>
        <CardDescription>
          {digest.window.from
            ? `${digest.window.from} → ${digest.window.to} · ${digest.totalMentions}`
            : t("digest.nothing")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topSignal.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("digest.topSignal")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {topSignal.map((ti) => (
                <button
                  key={ti.ticker}
                  onClick={() => onSelect(ti.ticker)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/10"
                >
                  <span className="text-accent">${ti.ticker}</span>
                  <SignalBadge score={ti.signalScore} band={ti.signalBand} />
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("digest.discussed")}
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
              <span className="text-sm text-muted-foreground">{t("digest.nothing")}</span>
            )}
          </div>
        </div>
        {digest.newTickers.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("digest.new")}
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
