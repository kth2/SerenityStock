import { useMemo, useState } from "react";
import { History, Microscope, Search, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiAnalysisView,
  ComparisonView,
  StructuredAnalysis,
  ThemeAnalysisView,
} from "@/components/AnalysisPanel";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { runQuery } from "@/lib/serenity/engine";
import { cn } from "@/lib/utils";
import type { AnalysesData, AnalysisResult, MentionsData, TickerAggregate } from "@/types";

const EXAMPLES = ["AAOI", "neocloud stocks", "AI CPO", "WULF, CIFR, IREN", "data center power", "robotics"];

const KIND_LABEL: Record<string, string> = {
  ticker: "single company",
  comparison: "comparison",
  theme: "theme scan",
};

interface AnalyzeTabProps {
  data: MentionsData | null;
  analyses: AnalysesData | null;
}

export function AnalyzeTab({ data, analyses }: AnalyzeTabProps) {
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<{ query: string; result: AnalysisResult } | null>(null);
  const { history, save, remove, clear } = useAnalysisHistory();

  const aggs = useMemo(() => {
    const m = new Map<string, TickerAggregate>();
    for (const t of data?.tickers ?? []) m.set(t.ticker, t);
    return m;
  }, [data]);

  function analyze(raw: string) {
    const q = raw.trim();
    if (!q || running) return;
    setRunning(true);
    setQuery(q);
    // Small delay so the running state is perceivable; the engine is sync.
    window.setTimeout(() => {
      const result = runQuery(q, aggs);
      setCurrent({ query: q, result });
      save(q, result);
      setRunning(false);
    }, 500);
  }

  // Prefer a precomputed Claude-API analysis for single tickers when available.
  const apiAnalysis =
    current?.result.kind !== "theme" && current?.result.kind !== "comparison"
      ? analyses?.analyses?.[(current?.result as { ticker?: string })?.ticker ?? ""]
      : undefined;

  return (
    <div className="space-y-4">
      {/* Hero input */}
      <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">
              Analyze anything with the Serenity Skill
            </h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              analyze(query);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ticker, list of tickers, or theme — e.g. AAOI · neocloud stocks · AI CPO · robotics"
                aria-label="Analyze a ticker, list of tickers, or theme"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <Button type="submit" size="lg" disabled={running || !query.trim()} className="gap-2">
              <Microscope className="h-4 w-4" />
              {running ? "Running skill…" : "Deep Analyze"}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => analyze(ex)}
                className="rounded-md border border-border/70 bg-background/50 px-2 py-1 text-xs text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                {ex}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Runs the bundled Serenity research workflow: value-chain breakdown → scarce-layer
            ranking → bottleneck scorecard → graded evidence → failure modes → next checks.
            One ticker = deep dive · several = ranked comparison · words = theme scan.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        {/* Result */}
        <div className="min-w-0">
          {current ? (
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                  <Badge>{KIND_LABEL[current.result.kind ?? "ticker"]}</Badge>
                  <span className="text-sm text-muted-foreground">“{current.query}”</span>
                  <button
                    onClick={() => setCurrent(null)}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    aria-label="Close result"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {current.result.kind === "theme" ? (
                  <ThemeAnalysisView analysis={current.result} />
                ) : current.result.kind === "comparison" ? (
                  <ComparisonView analysis={current.result} />
                ) : apiAnalysis ? (
                  <ApiAnalysisView analysis={apiAnalysis} />
                ) : (
                  <StructuredAnalysis analysis={current.result} />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
                <Microscope className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Enter a ticker or theme above — or revisit a past analysis from the
                  history panel.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History */}
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Past analyses</CardTitle>
            </div>
            {history.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-bearish"
                title="Clear all history"
              >
                Clear
              </button>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Analyses are saved here (locally in your browser) with timestamps.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.id} className="group flex items-start gap-1">
                    <button
                      onClick={() => {
                        setQuery(h.query);
                        setCurrent({ query: h.query, result: h.result });
                      }}
                      className={cn(
                        "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
                        current?.query === h.query && "bg-muted/40",
                      )}
                    >
                      <span className="block truncate text-sm">{h.label}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {KIND_LABEL[h.kind]} ·{" "}
                        {new Date(h.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                    <button
                      onClick={() => remove(h.id)}
                      className="mt-1.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity hover:text-bearish group-hover:opacity-100"
                      aria-label={`Delete ${h.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
