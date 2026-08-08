import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BrainCircuit, History, Play, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MarketMindReportView } from "@/components/MarketMindReport";
import { useSimulationHistory } from "@/hooks/useSimulationHistory";
import { LocalMarketMindEngine, TARGET_CALLS } from "@/lib/marketmind/engine";
import type { MarketMindReport, SimulationProgress } from "@/lib/marketmind/types";
import { aiConfigured, loadAiConfig, type AiConfig } from "@/lib/serenity/ai";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { MentionsData, TickerAggregate } from "@/types";

const EXAMPLES = ["AAOI", "neocloud stocks", "AI CPO", "data center power"];

interface MarketMindTabProps {
  data: MentionsData | null;
  /** Opens the shared AI settings panel (owned by the Analyze tab). */
  onOpenAiSettings?: () => void;
}

export function MarketMindTab({ data, onOpenAiSettings }: MarketMindTabProps) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SimulationProgress | null>(null);
  const [report, setReport] = useState<MarketMindReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const { history, save, remove, clear } = useSimulationHistory();
  const abortRef = useRef<AbortController | null>(null);

  // Re-read the shared AI config whenever the tab regains focus, so connecting
  // a model in the Analyze tab takes effect here without a reload.
  useEffect(() => {
    const sync = () => setAiConfig(loadAiConfig());
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  const aggs = useMemo(() => {
    const m = new Map<string, TickerAggregate>();
    for (const tk of data?.tickers ?? []) m.set(tk.ticker, tk);
    return m;
  }, [data]);

  const aiOn = aiConfigured(aiConfig);

  async function run(raw: string) {
    const q = raw.trim();
    if (!q || running) return;
    if (!aiOn) {
      setError(t("mm.needsAi"));
      return;
    }
    setRunning(true);
    setError(null);
    setReport(null);
    setQuery(q);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const engine = new LocalMarketMindEngine({ config: aiConfig, aggs });
    try {
      const result = await engine.run(
        { query: q, lang },
        { signal: controller.signal, onProgress: setProgress },
      );
      if (controller.signal.aborted) return;
      setReport(result);
      save(result);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      if (abortRef.current === controller) {
        setRunning(false);
        setProgress(null);
        abortRef.current = null;
      }
    }
  }

  const used = progress?.budget.totalCalls ?? 0;

  return (
    <div className="min-w-0 space-y-4">
      {/* Hero */}
      <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-2 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 shrink-0 text-primary" />
            <h2 className="min-w-0 break-words text-base font-semibold">{t("mm.title")}</h2>
          </div>
          <p className="mb-3 break-words text-xs leading-relaxed text-muted-foreground">
            {t("mm.tagline")}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(query);
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("mm.placeholder")}
              aria-label={t("mm.placeholder")}
              autoCapitalize="characters"
              spellCheck={false}
              className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            {running ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => abortRef.current?.abort()}
                className="shrink-0 gap-2"
              >
                <X className="h-4 w-4" /> {t("mm.cancel")}
              </Button>
            ) : (
              <Button type="submit" size="lg" disabled={!query.trim()} className="shrink-0 gap-2">
                <Play className="h-4 w-4" /> {t("mm.run")}
              </Button>
            )}
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => run(ex)}
                disabled={running}
                className="rounded-md border border-border/70 bg-background/50 px-2 py-1 text-xs text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>

          <p className="mt-3 break-words text-xs leading-relaxed text-muted-foreground">
            {t("mm.desc")}
          </p>

          {!aiOn && (
            <p className="mt-2 break-words text-xs leading-relaxed text-accent">
              {t("mm.needsAi")}{" "}
              {onOpenAiSettings && (
                <button onClick={onOpenAiSettings} className="underline hover:no-underline">
                  ⚙
                </button>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {running && progress && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-sm">{progress.label}</span>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {used} / {TARGET_CALLS} {t("mm.calls")}
              </Badge>
            </div>
            <Progress value={progress.percent} />
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-bearish/40 bg-bearish/10 px-4 py-2.5 text-xs leading-relaxed text-bearish">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* Report */}
        <div className="min-w-0">
          {report ? (
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
                  <Badge>{report.seed.kind}</Badge>
                  <span className="min-w-0 break-words text-sm text-muted-foreground">
                    “{report.query}”
                  </span>
                  <button
                    onClick={() => setReport(null)}
                    className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <MarketMindReportView report={report} />
              </CardContent>
            </Card>
          ) : (
            !running && (
              <Card className="border-dashed">
                <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
                  <BrainCircuit className="h-8 w-8 text-muted-foreground/50" />
                  <p className="break-words text-sm text-muted-foreground">{t("mm.empty")}</p>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* History */}
        <Card className="h-fit min-w-0">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle>{t("mm.history")}</CardTitle>
            </div>
            {history.length > 0 && (
              <button onClick={clear} className="text-xs text-muted-foreground hover:text-bearish">
                {t("history.clear")}
              </button>
            )}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("mm.historyEmpty")}</p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.id} className="group flex items-start gap-1">
                    <button
                      onClick={() => {
                        setQuery(h.query);
                        setError(null);
                        setReport(h.report);
                      }}
                      className={cn(
                        "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50",
                        report?.id === h.id && "bg-muted/40",
                      )}
                    >
                      <span className="block truncate text-sm">{h.query}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {h.report.budget.totalCalls} {t("mm.calls")} ·{" "}
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
                      aria-label={`Delete ${h.query}`}
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
