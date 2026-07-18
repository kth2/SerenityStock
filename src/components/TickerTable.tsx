import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Microscope, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiAnalysisView, StructuredAnalysis } from "@/components/AnalysisPanel";
import { TickerSparkline } from "@/components/Charts";
import { runSerenityAnalysis, isCurated } from "@/lib/serenity/engine";
import { cn } from "@/lib/utils";
import type { AnalysesData, MentionsData, SerenityAnalysis, TickerAggregate } from "@/types";

function sentimentVariant(label: string): "bullish" | "bearish" | "secondary" {
  return label === "bullish" ? "bullish" : label === "bearish" ? "bearish" : "secondary";
}

interface TickerTableProps {
  data: MentionsData;
  analyses: AnalysesData | null;
  selected: string | null;
  onSelect: (ticker: string | null) => void;
}

export function TickerTable({ data, analyses, selected, onSelect }: TickerTableProps) {
  const [query, setQuery] = useState("");
  const [analysisFor, setAnalysisFor] = useState<Record<string, SerenityAnalysis>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase().replace(/^\$/, "");
    if (!q) return data.tickers;
    return data.tickers.filter((t) => t.ticker.includes(q));
  }, [data, query]);

  // Scroll the externally-selected ticker into view (dashboard → table jumps).
  useEffect(() => {
    if (selected && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-ticker="${selected}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  function analyze(ticker: string, agg: TickerAggregate) {
    // Brief delay so the "running the workflow" state is perceivable — the
    // simulated engine itself is synchronous.
    setAnalyzing(ticker);
    window.setTimeout(() => {
      setAnalysisFor((prev) => ({ ...prev, [ticker]: runSerenityAnalysis(ticker, agg) }));
      setAnalyzing(null);
    }, 450);
  }

  return (
    <Card ref={containerRef as React.RefObject<HTMLDivElement>}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Ticker tracker</CardTitle>
            <CardDescription>
              {data.tickers.length} tickers · tap a row for history &amp; deep analysis
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker…"
              className="pl-8"
              aria-label="Search tickers"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Column header */}
        <div className="hidden grid-cols-[1fr_5rem_6rem_5rem_2rem] gap-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Ticker</span>
          <span className="text-right">Mentions</span>
          <span className="text-right">Sentiment</span>
          <span className="text-right">Last seen</span>
          <span />
        </div>

        {filtered.map((t) => {
          const open = selected === t.ticker;
          const api = analyses?.analyses?.[t.ticker];
          const local = analysisFor[t.ticker];
          return (
            <div
              key={t.ticker}
              data-ticker={t.ticker}
              className={cn(
                "overflow-hidden rounded-lg border transition-colors",
                open ? "border-primary/40 bg-background/60" : "border-border/60 bg-background/30",
              )}
            >
              <button
                onClick={() => onSelect(open ? null : t.ticker)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30 sm:grid-cols-[1fr_5rem_6rem_5rem_2rem]"
                aria-expanded={open}
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-accent">${t.ticker}</span>
                  {isCurated(t.ticker) && (
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                      in knowledge base
                    </Badge>
                  )}
                </span>
                <span className="hidden text-right text-sm tabular-nums sm:block">
                  {t.count}
                </span>
                <span className="hidden text-right sm:block">
                  <Badge variant={sentimentVariant(t.sentimentLabel)}>
                    {t.sentimentLabel} {t.avgSentiment > 0 ? "+" : ""}
                    {t.avgSentiment.toFixed(2)}
                  </Badge>
                </span>
                <span className="hidden text-right text-xs text-muted-foreground sm:block">
                  {t.lastSeen.slice(5, 10)}
                </span>
                <span className="flex items-center justify-end gap-2 sm:justify-center">
                  <span className="text-xs tabular-nums text-muted-foreground sm:hidden">
                    {t.count}× · {t.sentimentLabel}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </span>
              </button>

              {open && (
                <div className="space-y-4 border-t border-border/60 p-3 sm:p-4">
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Mention &amp; sentiment history
                    </h4>
                    <TickerSparkline history={t.history} />
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent mentions
                    </h4>
                    <ul className="space-y-2">
                      {data.mentions
                        .filter((m) => m.ticker === t.ticker)
                        .slice(0, 3)
                        .map((m) => (
                          <li key={m.tweetId} className="text-sm text-foreground/85">
                            <span className="mr-2 text-xs text-muted-foreground">
                              {m.createdAt.slice(5, 10)}
                            </span>
                            {m.text.length > 180 ? `${m.text.slice(0, 180)}…` : m.text}
                          </li>
                        ))}
                    </ul>
                  </div>

                  {/* Deep analysis */}
                  {api ? (
                    <ApiAnalysisView analysis={api} />
                  ) : local ? (
                    <StructuredAnalysis analysis={local} />
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Run the Serenity Skill research workflow: value-chain
                        breakdown, scarce-layer ranking, graded evidence, risks,
                        and a bottleneck scorecard.
                      </p>
                      <Button
                        onClick={() => analyze(t.ticker, t)}
                        disabled={analyzing === t.ticker}
                        className="gap-2"
                      >
                        <Microscope className="h-4 w-4" />
                        {analyzing === t.ticker
                          ? "Running skill workflow…"
                          : "Deep Analyze with Serenity Skill"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tickers match “{query}”.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
